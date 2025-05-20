import { StyleSheet, Text, View, TouchableWithoutFeedback } from 'react-native';
import { useMemo, RefObject, useEffect, useState } from 'react';
import {
    BottomSheetModal,
    BottomSheetScrollView,
    BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import MapView, { Marker } from 'react-native-maps';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useMedia } from '../../../providers/MediaProvider';
import { useTheme } from '../../../providers/ThemeProvider';
import { colors } from '../../../utils/colors';

type DetailsModalProps = {
    bottomSheetModalRef: RefObject<BottomSheetModal | null>;
    handleSheetChanges: (index: number) => void;
    asset: any;
    indexModal: number;
};

interface Tab {
    id: string;
    icon: 'information-circle-outline' | 'location-outline' | 'code-slash-outline';
    label: string;
}

// Format file size to readable format
const formatFileSize = (size: number) => {
    if (size < 1024) {
        return `${size} B`;
    } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    } else if (size < 1024 * 1024 * 1024) {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    } else {
        return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
};

// Format date to readable format
const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

// Format time to readable format
const formatTime = (timestamp: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

const DetailsModal = ({ bottomSheetModalRef, handleSheetChanges, asset, indexModal }: DetailsModalProps) => {
    const { getDetailedInfo } = useMedia();
    const { currentTheme, textColor, bgColor } = useTheme();
    const snapPoints = useMemo(() => ['85%', '100%'], []);
    const [info, setInfo] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('info');

    const color = { color: textColor };
    const backgroundColor = { backgroundColor: bgColor };
    const cardBgColor = { backgroundColor: currentTheme === 'dark' ? '#282828' : '#f5f5f5' };
    const borderColor = { borderColor: currentTheme === 'dark' ? '#3a3a3a' : '#e0e0e0' };

    useEffect(() => {
        const fetchInfo = async () => {
            if (indexModal === 0) {  
                const infoAsset = await getDetailedInfo(asset);
                setInfo(infoAsset);
            }
        };

        fetchInfo();
    }, [indexModal]);

    // Get file extension
    const getFileExtension = (filename: string) => {
        if (!filename) return '';
        const extension = filename.split('.').pop();
        return extension ? extension.toUpperCase() : '';
    };

    // Get creation date
    const getCreationDate = () => {
        if (asset?.isLocalAsset) {
            return info?.creationTime ? formatDate(info.creationTime) : 'Unknown';
        } else {
            return info?.createdAt ? formatDate(info.createdAt) : 'Unknown';
        }
    };

    // Get creation time
    const getCreationTime = () => {
        if (asset?.isLocalAsset) {
            return info?.creationTime ? formatTime(info.creationTime) : '';
        } else {
            return info?.createdAt ? formatTime(info.createdAt) : '';
        }
    };

    // Get modification date
    const getModificationDate = () => {
        if (asset?.isLocalAsset) {
            return info?.modificationTime ? formatDate(info.modificationTime) : 'Unknown';
        } else {
            return info?.lastModified ? formatDate(info.lastModified) : 'Unknown';
        }
    };

    // Get file name
    const getFileName = () => {
        if (asset?.isLocalAsset) {
            return info?.filename || 'Unknown';
        } else {
            return info?.metadata?.fileName || info?.name?.split('/').pop() || 'Unknown';
        }
    };

    // Get camera info from exif
    const getCameraInfo = () => {
        const exif = info?.exif || (info?.metadata?.exif && info.metadata.exif !== '' ? info.metadata.exif : null);
    
        if (!exif) return null;
    
        return {
            make: exif.Make || null,
            model: exif.Model || null,
            aperture: exif.FNumber ? `f/${exif.FNumber}` : null,
            exposureTime: exif.ExposureTime ? `${exif.ExposureTime}s` : null,
            iso: exif.ISOSpeedRatings || null,
            focalLength: exif.FocalLength ? `${exif.FocalLength}mm` : null,
        };
    };    

    const renderInfoTab = () => (
        <>
            {/* Basic Info Card */}
            <View style={[styles.card, cardBgColor, borderColor]}>
                <View style={styles.cardHeader}>
                    <MaterialIcons name="info-outline" size={22} color={textColor} />
                    <Text style={[styles.cardTitle, color]}>Basic Information</Text>
                </View>
                
                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, color]}>File name</Text>
                    <Text style={[styles.infoValue, color]} numberOfLines={1}>{getFileName()}</Text>
                </View>
                
                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, color]}>Format</Text>
                    <Text style={[styles.infoValue, color]}>{getFileExtension(getFileName())}</Text>
                </View>
                
                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, color]}>Type</Text>
                    <Text style={[styles.infoValue, color]}>{info?.mediaType || asset?.mediaType || info?.metadata?.mediaType || 'Unknown'}</Text>
                </View>
                
                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, color]}>Size</Text>
                    <Text style={[styles.infoValue, color]}>{formatFileSize(info?.size || 0)}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, color]}>Resolution</Text>
                    <Text style={[styles.infoValue, color]}>
                        {info?.width || info?.metadata?.width || 0} × {info?.height || info?.metadata?.height || 0}
                    </Text>
                </View>

                {info?.duration > 0 && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, color]}>Duration</Text>
                        <Text style={[styles.infoValue, color]}>{`${Math.floor(info.duration / 60)}:${(info.duration % 60).toString().padStart(2, '0')}`}</Text>
                    </View>
                )}
            </View>

            {/* Date & Time Card */}
            <View style={[styles.card, cardBgColor, borderColor]}>
                <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="calendar-clock" size={22} color={textColor} />
                    <Text style={[styles.cardTitle, color]}>Date & Time</Text>
                </View>
                
                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, color]}>Created</Text>
                    <Text style={[styles.infoValue, color]}>{getCreationDate()} {getCreationTime()}</Text>
                </View>
                
                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, color]}>Modified</Text>
                    <Text style={[styles.infoValue, color]}>{getModificationDate()}</Text>
                </View>
            </View>

            {/* Camera Info Card */}
            {getCameraInfo() && Object.values(getCameraInfo() || {}).some(value => value !== null) && (
                <View style={[styles.card, cardBgColor, borderColor]}>
                    <View style={styles.cardHeader}>
                        <FontAwesome5 name="camera" size={20} color={textColor} />
                        <Text style={[styles.cardTitle, color]}>Camera Information</Text>
                    </View>
                    
                    {getCameraInfo()?.make && (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, color]}>Make</Text>
                            <Text style={[styles.infoValue, color]}>{getCameraInfo()?.make}</Text>
                        </View>
                    )}
                    
                    {getCameraInfo()?.model && (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, color]}>Model</Text>
                            <Text style={[styles.infoValue, color]}>{getCameraInfo()?.model}</Text>
                        </View>
                    )}
                    
                    {getCameraInfo()?.aperture && (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, color]}>Aperture</Text>
                            <Text style={[styles.infoValue, color]}>{getCameraInfo()?.aperture}</Text>
                        </View>
                    )}
                    
                    {getCameraInfo()?.exposureTime && (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, color]}>Exposure</Text>
                            <Text style={[styles.infoValue, color]}>{getCameraInfo()?.exposureTime}</Text>
                        </View>
                    )}
                    
                    {getCameraInfo()?.iso && (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, color]}>ISO</Text>
                            <Text style={[styles.infoValue, color]}>{getCameraInfo()?.iso}</Text>
                        </View>
                    )}
                    
                    {getCameraInfo()?.focalLength && (
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, color]}>Focal Length</Text>
                            <Text style={[styles.infoValue, color]}>{getCameraInfo()?.focalLength}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* ID Information Card */}
            <View style={[styles.card, cardBgColor, borderColor]}>
                <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="identifier" size={22} color={textColor} />
                    <Text style={[styles.cardTitle, color]}>ID Information</Text>
                </View>
                
                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, color]}>Asset ID</Text>
                    <Text style={[styles.infoValue, color]} numberOfLines={1}>{info?.id || 'Unknown'}</Text>
                </View>
                
                {info?.albumId && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, color]}>Album ID</Text>
                        <Text style={[styles.infoValue, color]} numberOfLines={1}>{info.albumId}</Text>
                    </View>
                )}
                
                {info?.version && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, color]}>Version</Text>
                        <Text style={[styles.infoValue, color]} numberOfLines={1}>{info.version}</Text>
                    </View>
                )}
            </View>
        </>
    );

    const renderLocationTab = () => {
        const location =
            info?.location?.latitude && info?.location?.longitude
                ? info.location
                : info?.metadata?.location?.latitude && info?.metadata?.location?.longitude
                ? info.metadata.location
                : null;
    
        const altitude =
            info?.exif?.GPSAltitude ??
            info?.metadata?.exif?.GPSAltitude ??
            null;
    
        return (
            <>
                {location ? (
                    <>
                        <View style={[styles.card, cardBgColor, borderColor]}>
                            <View style={styles.cardHeader}>
                                <Entypo name="location-pin" size={22} color={textColor} />
                                <Text style={[styles.cardTitle, color]}>Location Details</Text>
                            </View>
    
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, color]}>Latitude</Text>
                                <Text style={[styles.infoValue, color]}>
                                    {location.latitude.toFixed(6)}
                                </Text>
                            </View>
    
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, color]}>Longitude</Text>
                                <Text style={[styles.infoValue, color]}>
                                    {location.longitude.toFixed(6)}
                                </Text>
                            </View>
    
                            {altitude !== null && (
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, color]}>Altitude</Text>
                                    <Text style={[styles.infoValue, color]}>
                                        {`${altitude} m`}
                                    </Text>
                                </View>
                            )}
                        </View>
    
                        <View style={styles.mapContainerLarge}>
                            <MapView
                                style={styles.map}
                                region={{
                                    latitude: Number(location.latitude),
                                    longitude: Number(location.longitude),
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                }}
                                loadingEnabled
                                loadingIndicatorColor={textColor}
                                loadingBackgroundColor={bgColor}
                                mapType="standard"
                            >
                                <Marker coordinate={location} title={getFileName()} />
                            </MapView>
                        </View>
                    </>
                ) : (
                    <View style={styles.noContentContainer}>
                        <Entypo name="location" size={48} color={textColor} />
                        <Text style={[styles.noContentText, color]}>No Location Data Available</Text>
                        <Text style={[styles.noContentSubText, { color: currentTheme === 'dark' ? '#aaaaaa' : '#777777' }]}>
                            This media doesn't contain location information
                        </Text>
                    </View>
                )}
            </>
        );
    };    

    const renderExifTab = () => {
        const exif =
            info?.exif && Object.keys(info.exif).length > 0
                ? info.exif
                : info?.metadata?.exif && typeof info.metadata.exif === 'object' && Object.keys(info.metadata.exif).length > 0
                ? info.metadata.exif
                : null;
    
        return (
            <>
                {exif ? (
                    <View style={[styles.card, cardBgColor, borderColor]}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="file-code-outline" size={22} color={textColor} />
                            <Text style={[styles.cardTitle, color]}>EXIF Data</Text>
                        </View>
    
                        {Object.entries(exif)
                            .filter(([key, value]) =>
                                key !== 'MakerNote' &&
                                key !== 'ThumbnailImageLength' &&
                                key !== 'ThumbnailImageWidth' &&
                                key !== 'JPEGInterchangeFormat' &&
                                key !== 'JPEGInterchangeFormatLength' &&
                                value !== undefined
                            )
                            .sort((a, b) => a[0].localeCompare(b[0]))
                            .map(([key, value]) => (
                                <View key={key} style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, color]}>{key}</Text>
                                    <Text style={[styles.infoValue, color]} numberOfLines={1}>
                                        {typeof value === 'object' ? JSON.stringify(value) : value?.toString()}
                                    </Text>
                                </View>
                            ))}
                    </View>
                ) : (
                    <View style={styles.noContentContainer}>
                        <MaterialCommunityIcons name="file-code-outline" size={48} color={textColor} />
                        <Text style={[styles.noContentText, color]}>No EXIF Data Available</Text>
                        <Text style={[styles.noContentSubText, { color: currentTheme === 'dark' ? '#aaaaaa' : '#777777' }]}>
                            This media doesn't contain EXIF information
                        </Text>
                    </View>
                )}
            </>
        );
    };    

    const renderTabs = () => {        
        const tabs: Tab[] = [
            { id: 'info', icon: 'information-circle-outline', label: 'Info' },
            { id: 'location', icon: 'location-outline', label: 'Location' },
            { id: 'exif', icon: 'code-slash-outline', label: 'EXIF' },
        ];

        return (
            <View style={styles.tabsContainer}>
                {tabs.map(tab => (
                    <TouchableWithoutFeedback 
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <View style={[
                            styles.tabButton, 
                            activeTab === tab.id && styles.activeTabButton,
                            activeTab === tab.id && { borderBottomColor: currentTheme === 'dark' ? colors.white : colors.black }
                        ]}>
                            <Ionicons 
                                name={tab.icon} 
                                size={20} 
                                color={activeTab === tab.id 
                                    ? (currentTheme === 'dark' ? colors.white : colors.black)
                                    : (currentTheme === 'dark' ? '#aaaaaa' : '#777777')
                                } 
                            />
                            <Text style={[
                                styles.tabLabel,
                                { color: activeTab === tab.id 
                                    ? (currentTheme === 'dark' ? colors.white : colors.black)
                                    : (currentTheme === 'dark' ? '#aaaaaa' : '#777777')
                                }
                            ]}>
                                {tab.label}
                            </Text>
                        </View>
                    </TouchableWithoutFeedback>
                ))}
            </View>
        );
    };

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose={true}
            backdropComponent={(props) => (
                <BottomSheetBackdrop
                    {...props}
                    appearsOnIndex={0}
                    disappearsOnIndex={-1}
                    opacity={0.7}
                />
            )}
            onChange={handleSheetChanges}
            handleIndicatorStyle={{ backgroundColor: currentTheme === 'dark' ? colors.white : colors.black }}
            backgroundStyle={{ backgroundColor: bgColor }}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            detached={false}
            enableContentPanningGesture={true}
            enableHandlePanningGesture={true}
            enableOverDrag={false}
            enableDynamicSizing={false}
        >
            {/* Header (Static) */}
            <View style={[styles.header, backgroundColor]}>
                <Text style={[styles.headerTitle, color]} numberOfLines={1}>
                    {getFileName()}
                </Text>
                <Text style={[styles.headerSubtitle, { color: currentTheme === 'dark' ? '#aaaaaa' : '#777777' }]}>
                    {getCreationDate()} • {getCreationTime()}
                </Text>
            </View>

            {/* Tab Navigation (Static) */}
            <View style={[styles.tabsWrapper, backgroundColor]}>
                {renderTabs()}
            </View>

            {/* Content (Scrollable) */}
            <BottomSheetScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
                nestedScrollEnabled={true}
                bounces={true}
                overScrollMode="always"
            >
                <View style={styles.tabContent}>
                    {activeTab === 'info' && renderInfoTab()}
                    {activeTab === 'location' && renderLocationTab()}
                    {activeTab === 'exif' && renderExifTab()}
                </View>
            </BottomSheetScrollView>
        </BottomSheetModal>
    );
};

export default DetailsModal;

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        width: '100%',
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        width: '100%',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
    },
    tabsWrapper: {
        width: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 32,
    },
    tabsContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#3a3a3a',
        marginBottom: 16,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTabButton: {
        borderBottomWidth: 2,
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    tabContent: {
        paddingHorizontal: 16,
        gap: 16,
        width: '100%',
        paddingTop: 8,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        width: '100%',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingVertical: 4,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500',
        width: '40%',
    },
    infoValue: {
        fontSize: 14,
        flex: 1,
        textAlign: 'right',
    },
    mapContainerLarge: {
        width: '100%',
        height: 250,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    noContentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    noContentText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    noContentSubText: {
        fontSize: 14,
        textAlign: 'center',
    },
});