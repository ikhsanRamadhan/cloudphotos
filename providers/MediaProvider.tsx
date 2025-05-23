import { 
    createContext, 
    PropsWithChildren, 
    useContext, 
    useCallback, 
    useEffect, 
    useState, 
    useMemo, 
    Dispatch, 
    SetStateAction 
} from "react";
import { Dimensions, Platform, Share } from "react-native";
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import mime from 'mime';
import { GoogleGenAI } from '@google/genai';
import * as Sharing from 'expo-sharing';

import { supabase } from "../utils/supabase";
import { useAuth } from "./AuthProvider";

type MediaContextType = {
    userId: string | undefined;
    assets: any[];
    localAssets: any[];
    numColumns: number;
    itemSize: number;
    isLoadingUpload: boolean;
    isLoadingDelete: boolean;
    loading: boolean;
    uploadedCount: number;
    setAssetsFullyLoaded: Dispatch<SetStateAction<boolean>>;
    fetchAssets: () => void;
    getAssetById: (id: string) => (any) | undefined;
    syncAssetsToCloud: (asset: MediaLibrary.Asset) => void;
    deleteAssetFromCloud: (asset: MediaLibrary.Asset) => void;
    getInfoAsset: (asset: MediaLibrary.Asset) => Promise<InfoAsset>;
    reloadBackupIndex: () => void;
    callGeminiAPI: (asset: any, uri: string) => Promise<{ tags: string[], quality: string, caption: string } | null>;
    getDetailedInfo: (asset: any) => Promise<MediaLibrary.AssetInfo | InfoAsset | null>;
    shareLocalImage: (selectedImage: string) => Promise<void>;
    shareImageFromUrl: (imageUri: string, imageId: string) => Promise<void>;
};

interface InfoAsset {
    id: string;
    name: string;
    version: string;
    bucketId: string;
    size: number;
    contentType: string;
    cacheControl: string;
    etag: string;
    metadata: {
        id: string;
        width: number;
        height: number;
        fileName: string;
        extension: string;
        mediaType: string;
        location: {} | string;
        exif: {} | string;
    };
    lastModified: string;
    createdAt: string;
};

const MediaContext = createContext<MediaContextType>({
    userId: undefined,
    assets: [],
    localAssets: [],
    numColumns: 4,
    itemSize: 0,
    isLoadingUpload: false,
    isLoadingDelete: false,
    loading: false,
    uploadedCount: 0,
    setAssetsFullyLoaded: () => {},
    fetchAssets: () => {},
    getAssetById: () => undefined,
    syncAssetsToCloud: () => {},
    deleteAssetFromCloud: () => {},
    getInfoAsset: () => new Promise<InfoAsset>(() => {}),
    reloadBackupIndex: () => {},
    callGeminiAPI: () => new Promise<{ tags: string[], quality: string, caption: string } | null>(() => {}),
    getDetailedInfo: () => new Promise<MediaLibrary.AssetInfo | InfoAsset | null>(() => {}),
    shareLocalImage: () => new Promise<void>(() => {}),
    shareImageFromUrl: () => new Promise<void>(() => {}),
});

export default function MediaContextProvider({ children }: PropsWithChildren) {
    const { user } = useAuth();
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [localAssets, setLocalAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [backupIndex, setBackupIndex] = useState<Set<string>>(new Set());
    const [backupIndexLoaded, setBackupIndexLoaded] = useState(false);
    const [remoteAssets, setRemoteAssets] = useState<InfoAsset[]>([]);
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [isLoadingUpload, setIsLoadingUpload] = useState(false);
    const [isLoadingDelete, setIsLoadingDelete] = useState(false);
    const [assetsFullyLoaded, setAssetsFullyLoaded] = useState(false);
    const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY });

    // Layout calculations
    const { width } = Dimensions.get('window');
    const numColumns = 3;
    const itemSize = width / numColumns;

    // Reload backup index from Supabase storage
    const reloadBackupIndex = useCallback(async () => {
        if (!user) return;

        let offset = 0;
        const ids = new Set<string>();

        while (true) {
            const { data, error } = await supabase.storage
                .from('assets')
                .list(user.id, { limit: 1000, offset });

            if (error || !data) {
                console.error('Failed to list backups:', error);
                break;
            }

            await Promise.all(data.map(async file => {
                let assetId = file.metadata?.id;

                if (!assetId) {
                    // Fallback: fetch full file info to read metadata
                    const { data: infoData, error: infoErr } = await supabase.storage
                        .from('assets')
                        .info(`${user.id}/${file.name}`);

                    if (infoErr || !infoData) {
                        console.error('Failed to fetch file info for', file.name, infoErr);
                        assetId = file.name;
                    } else {
                        assetId = infoData.metadata?.id || file.name;
                    }
                }

                ids.add(assetId);
            }));
            
            if (data.length < 1000) break;
            offset += data.length;
        }

        setBackupIndex(ids);
        setBackupIndexLoaded(true);
    }, [user]);

    useEffect(() => {
        if (user) {
            reloadBackupIndex();
            setUserId(user.id);
        };
    }, [user, reloadBackupIndex]);

    // Request permissions
    useEffect(() => {
        if (permissionResponse?.status !== 'granted') requestPermission();
    }, [permissionResponse, requestPermission]);

    // Fetch assets on permission grant
    useEffect(() => {
        if (permissionResponse?.status === 'granted' && backupIndexLoaded) {
            setLocalAssets([]);
            setAssetsFullyLoaded(false);
            loadAllLocalAssets();
            fetchRemoteAssets();
        }
    }, [permissionResponse, backupIndexLoaded]);

    // Load all local assets at once using pagination
    const loadAllLocalAssets = async () => {
        if (loading) return;
        setLoading(true);
        
        try {
            let allAssets: MediaLibrary.Asset[] = [];
            let hasMore = true;
            let cursor: string | undefined = undefined;
            
            // Keep fetching until we've loaded all assets
            while (hasMore) {
                try {
                    const options: MediaLibrary.AssetsOptions = {
                        mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
                        first: 500,
                        after: cursor,
                        sortBy: [MediaLibrary.SortBy.modificationTime],
                    };
                    
                    const assetsPage = await MediaLibrary.getAssetsAsync(options);
                    
                    allAssets = [...allAssets, ...assetsPage.assets];
                    
                    hasMore = assetsPage.hasNextPage;
                    cursor = assetsPage.endCursor;
                    
                    const markedAssets = assetsPage.assets.map(asset => ({
                        ...asset,
                        isBackedUp: backupIndex.has(asset.id.toString()),
                        isLocalAsset: true
                    }));
                    
                    setLocalAssets(prev => [...prev, ...markedAssets]);
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (batchError) {
                    console.error('Error fetching batch of assets:', batchError);
                    
                    if (!cursor) break;
                }
            }
            
            setAssetsFullyLoaded(true);
        } catch (error) {
            console.error('Error fetching all assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const localIds = useMemo(() => 
        new Set(localAssets.map(asset => asset.id))
    , [localAssets]);

    const remotesNotAlsoLocal = useMemo(() => 
        remoteAssets.filter(r => !localIds.has(r.metadata?.id))
    , [remoteAssets, localIds]);

    const assets = useMemo(() => {
        const getTimestamp = (item: any): number => {
            if (item.isLocalAsset) {
                return item.creationTime || item.modificationTime;
            }
            return new Date(item.createdAt || item.updated_at || 0).getTime();
        };

        return [...localAssets, ...remotesNotAlsoLocal].sort((a, b) => {
            return getTimestamp(b) - getTimestamp(a);
        });
    }, [localAssets, remotesNotAlsoLocal]);

    const uploadedCount = useMemo(() => {
        return assets.filter(asset => asset.isBackedUp).length;
    }, [assets]);

    const fetchAssets = useCallback(() => {
        if (!assetsFullyLoaded) {
            loadAllLocalAssets();
            fetchRemoteAssets();
        }
    }, [assetsFullyLoaded]);

    const fetchRemoteAssets = async () => {
        if (!user) return;

        const { data: files, error: listErr } = await supabase
            .storage
            .from('assets')
            .list(user.id);
        
        if (listErr) {
            console.error('Error listing files:', listErr);
            return;
        }
        if (!files) return;

        const updatedData = await Promise.all(
            files.map(async (file) => {
                const path = `${user.id}/${file.name}`;
                const { data: infoData, error: infoErr } = await supabase
                    .storage
                    .from('assets')
                    .info(path);
                
                if (infoErr || !infoData) {
                    console.error('Failed to fetch file info for', file.name, infoErr);
                    return file;
                }
        
                return {
                    ...file,
                    metadata: infoData.metadata,
                    createdAt: infoData.createdAt,
                };
            })
        );
        
        // filter that only has metadata length > 0
        const filteredData = updatedData.filter(file => file.metadata && Object.keys(file.metadata).length > 0);

        setRemoteAssets(filteredData as any);
    };

    const getAssetById = useCallback((id: string) => {
        return assets.find(asset => asset.id.toString() === id);
    }, [assets]);
    
    const syncAssetsToCloud = async (asset: MediaLibrary.Asset) => {
        try {
            setIsLoadingUpload(true);
            
            let info;
            try {
                info = await MediaLibrary.getAssetInfoAsync(asset);
            } catch (assetInfoError) {
                console.error('Error in getAssetInfoAsync:', assetInfoError);
                
                info = {
                    localUri: asset.uri,
                    uri: asset.uri,
                    width: asset.width || 0,
                    height: asset.height || 0,
                    mediaType: asset.mediaType || 'unknown',
                    filename: asset.filename
                };
            }
            
            if (!info.localUri && !info.uri) {
                console.warn('Missing URI for asset', asset.id);
                throw new Error('Missing URI for asset');
            }
            
            if (!user) {
                console.warn('User not found, cannot upload');
                throw new Error('User not found');
            }
            
            const fileUri = info.localUri || info.uri || asset.uri;
            
            let base64string;
            try {
                base64string = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
            } catch (readError) {
                console.error('Error reading file:', readError);
                throw new Error('Failed to read file: ' + readError);
            }
            
            const arrayBuffer = decode(base64string);

            const { error } = await supabase.storage
                .from('assets')
                .upload(`${user.id}/${asset.filename}`, arrayBuffer, {
                    contentType: mime.getType(asset.filename) || 'image/jpeg',
                    cacheControl: '3600',
                    upsert: true,
                    metadata: {
                        id: asset.id,
                        fileName: asset.filename,
                        width: info.width || 0,
                        height: info.height || 0,
                        extension: mime.getExtension(mime.getType(asset.filename) || 'image/jpeg'),
                        mediaType: info.mediaType || 'unknown',
                        location: info.location ? JSON.stringify(info.location) : '',
                        exif: info.exif ? JSON.stringify(info.exif) : '',
                    },
                });
            
            if (error) {
                console.error('Upload error:', error);
                throw new Error('Upload failed: ' + error.message);
            } else {
                setBackupIndex(prev => new Set(prev).add(asset.id));
                setLocalAssets(prev => prev.map(a => a.id === asset.id ? { ...a, isBackedUp: true } : a));
                await fetchRemoteAssets();
                console.log('Successfully uploaded', asset.filename);
                alert(`Successfully uploaded ${asset.filename}`);
            }
        } catch (err) {
            console.error('Upload exception:', err);
            alert(`Failed to upload ${asset.filename}: ${err}`);
        } finally {
            setIsLoadingUpload(false);
        }
    };

    const deleteAssetFromCloud = async (asset: any) => {
        try {
            if (!user) {
                console.warn('User not found, cannot delete.');
                return;
            }
            
            setIsLoadingDelete(true);
            
            const filePath = `${user.id}/${asset.filename || asset.name}`;
            
            const { error } = await supabase.storage
                .from('assets')
                .remove([filePath]);
            
            if (error) {
                console.error('Delete error:', error);
            } else {
                setBackupIndex(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(asset.id);
                    return newSet;
                });
                
                setLocalAssets(prev => prev.map(a =>
                    a.id === asset.id ? { ...a, isBackedUp: false } : a
                ));
                
                await fetchRemoteAssets();
                console.log('Successfully deleted', asset.filename || asset.name);
                alert(`Successfully deleted ${asset.filename || asset.name} from cloud`);
            }
        } catch (err) {
            console.error('Delete exception:', err);
        } finally {
            setIsLoadingDelete(false);
        }
    };

    const getInfoAsset = async (asset: any): Promise<InfoAsset> => {
        const { data, error } = await supabase.storage
            .from('assets')
            .info(`${user?.id}/${asset.filename || asset.name}`);

        if (error || !data?.createdAt) throw new Error('Asset not found');

        const lastModified = new Date(data.lastModified || '');
        const createdAt = new Date(data.createdAt);
        return {
            id: data.id || '',
            name: data.name || '',
            version: data.version || '',
            bucketId: data.bucketId || '',
            size: data.size || 0,
            contentType: data.contentType || '',
            cacheControl: data.cacheControl || '',
            etag: data.etag || '',
            metadata: {
                id: data.metadata?.id || '',
                width: data.metadata?.width || 0,
                height: data.metadata?.height || 0,
                fileName: data.metadata?.fileName || '',
                extension: data.metadata?.extension || '',
                mediaType: data.metadata?.mediaType || '',
                location: data.metadata?.location || '',
                exif: data.metadata?.exif || '',
            },
            lastModified: lastModified.toISOString(),
            createdAt: createdAt.toISOString(),
        };
    };

    const getDetailedInfo = async (asset: any): Promise<MediaLibrary.AssetInfo | InfoAsset | null> => {
        if (!asset) return null;
        
        if (asset.isLocalAsset === true) {
            try {
                const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
                
                let fileSize = 0;
                try {
                    const fileInfo = await FileSystem.getInfoAsync(asset.uri, { size: true }) as { size: number; exists: boolean; uri: string; isDirectory: boolean; }
                    fileSize = fileInfo.size || 0;
                } catch (fileError) {
                    console.warn('Error getting file size:', fileError);
                }
                
                return {
                    ...assetInfo,
                    size: fileSize,
                };
            } catch (error) {
                console.error('Error getting asset info:', error);
                return null;
            }
        }
        
        try {
            const info = await getInfoAsset(asset);
            return info;
        } catch (error) {
            console.error('Error getting remote asset info:', error);
            return null;
        }
    };

    const urlToBase64 = async (url: string) => {
        try {
            if (!FileSystem.cacheDirectory) {
                throw new Error('cacheDirectory is not available');
            }
            
            const ext = getFileExtension(url);
            const localPath = `${FileSystem.cacheDirectory}${Date.now()}.${ext}`;
            
            const downloadRes = await FileSystem.downloadAsync(url, localPath);
            
            const base64 = await FileSystem.readAsStringAsync(downloadRes.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            
            return base64;
        } catch (error) {
            console.error('Error converting URL to base64:', error);
            throw error;
        }
    };

    const getFileExtension = (url: string) => {
        const match = url.match(/\.(\w+)(\?|$)/);
        return match ? match[1] : 'jpg';
    };

    const callGeminiAPI = async (asset: any, uri: string): Promise<{ tags: string[]; quality: string; caption: string } | null> => {
        let base64string = '';
        
        if (asset.uri) {
            base64string = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
        } else {
            base64string = await urlToBase64(uri);
        }
        
        const mimeType = mime.getType(asset.filename || asset.metadata?.fileName || '') || 'image/jpeg';
        
        try {
            const contents = [
                {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: base64string,
                            mimeType,
                        },
                    },
                    {
                        text: `Describe this image briefly and identify key objects or themes. Return the result as ONLY valid JSON without markdown, no backticks or explanation. with fields: tags (array of strings only 2 or less that describe the image the most clearly and more generically), caption (string), quality (string: 'high', 'medium', or 'low')`,
                    },
                ],
                },
            ];
        
            const result = await ai.models.generateContent({
                model: 'gemini-2.0-flash-lite',
                config: {
                    responseMimeType: 'text/plain',
                },
                contents,
            });
        
            const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!raw) {
                console.warn("Empty Gemini response");
                return null;
            }
        
            try {
                return JSON.parse(raw);
            } catch {
                const cleaned = raw
                    .replace(/^```json|```$/g, '')
                    .replace(/^[^{]+/, '')
                    .trim();
            
                try {
                    const parsed = JSON.parse(cleaned);
                    console.log("Finished parsing cleaned JSON:", JSON.stringify(parsed, null, 2));
                    return parsed;
                } catch (e2) {
                    console.warn("Failed to parse cleaned JSON:", cleaned);
                    return null;
                }
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            throw error;
        }
    };

    const shareLocalImage = async ( imageUri: string) => {
        try {
            if (!imageUri) {
                console.log('No image selected for sharing');
                return;
            }
            
            const isSharingAvailable = await Sharing.isAvailableAsync();
            
            if (isSharingAvailable) {
                await Sharing.shareAsync(imageUri);
            } else {
                await Share.share({
                    url: Platform.OS === 'ios' ? `file://${imageUri}` : imageUri,
                    message: 'Shared this image',
                });
            }
        } catch (error) {
            console.error('Error sharing local image:', error);
        }
    };

    const shareImageFromUrl = async (imageUri: string, imageId: string) => {
        try {
            const fileName = `cache_image_${imageId}.jpg`;
            const localUri = `${FileSystem.cacheDirectory}${fileName}`;
            
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            
            if (!fileInfo.exists) {
                const downloadResult = await FileSystem.downloadAsync(imageUri, localUri);
                
                if (downloadResult.status !== 200) {
                    console.log('Failed to download image from URL');
                    return;
                }
            } else {
                console.log('File is already in cache, using existing file');
            }
            
            const isSharingAvailable = await Sharing.isAvailableAsync();
            
            if (isSharingAvailable) {
                await Sharing.shareAsync(localUri);
            } else {
                await Share.share({
                    url: Platform.OS === 'ios' ? `file://${localUri}` : localUri,
                    message: 'Shared this image'
                });
            }
        } catch (error) {
            console.error('Error sharing image from Cloud:', error);
        }
    };

    return (
        <MediaContext.Provider value={{
            userId,
            assets,
            localAssets,
            numColumns,
            itemSize,
            isLoadingUpload,
            isLoadingDelete,
            loading,
            uploadedCount,
            setAssetsFullyLoaded,
            fetchAssets,
            getAssetById,
            syncAssetsToCloud,
            deleteAssetFromCloud,
            getInfoAsset,
            reloadBackupIndex,
            callGeminiAPI,
            getDetailedInfo,
            shareLocalImage,
            shareImageFromUrl,
        }}>
            {children}
        </MediaContext.Provider>
    );
}

export const useMedia = () => useContext(MediaContext);
