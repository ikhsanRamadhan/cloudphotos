import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { useTheme } from '../../providers/ThemeProvider';
import { useMedia } from '../../providers/MediaProvider';
import { getImagekitUrlFromPath } from '../../utils/imagekit';
import { colors } from '../../utils/colors';
import { RootStackParamList } from '../../utils/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ShowHighlights'>;

const Highlights = () => {
    const { currentTheme, textColor, bgColor } = useTheme();
    const { userId, assets, callGeminiAPI } = useMedia();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [highlights, setHighlights] = useState<any[]>([]);
    const navigation = useNavigation<NavigationProp>();

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const insertTagsToAssets = async () => {
        setIsAnalyzing(true);
    
        const RATE_LIMIT_DELAY = 4000; // 4 seconds to prevent rate limit
        const RETRY_DELAY = 18000; // 18 seconds for retrying
    
        const analyzedAssets: any[] = [];
    
        try {
            for (const asset of assets) {
                const assetKey = asset.id || asset.name || asset.uri;
    
                try {
                    const cachedStr = await AsyncStorage.getItem(assetKey);
                    if (cachedStr) {
                        const cached = JSON.parse(cachedStr);
                        analyzedAssets.push({
                            ...asset,
                            ...cached,
                        });
                        continue;
                    }
    
                    let uri: string;
                    if (asset.isLocalAsset) {
                        uri = asset.uri;
                    } else {
                        uri = getImagekitUrlFromPath(`${userId}/${asset.name}`, [{ width: 500 }]);
                    }
    
                    try {
                        const result = await callGeminiAPI(asset, uri);
                        if (result) {
                            const enriched = {
                                ...asset,
                                tags: result.tags,
                                quality: result.quality,
                                caption: result.caption,
                            };
    
                            await AsyncStorage.setItem(
                                assetKey,
                                JSON.stringify({
                                    tags: result.tags,
                                    quality: result.quality,
                                    caption: result.caption,
                                })
                            );
    
                            analyzedAssets.push(enriched);
                        } else {
                            analyzedAssets.push(asset);
                        }
                    } catch (error: any) {
                        // Handle 429 error with backoff
                        if (error?.message?.includes("429")) {
                            console.warn("Rate limited. Retrying after delay...");
                            await sleep(RETRY_DELAY);
                            // Retry once after delay
                            try {
                                const result = await callGeminiAPI(asset, uri);
                                if (result) {
                                    const enriched = {
                                        ...asset,
                                        tags: result.tags,
                                        quality: result.quality,
                                        caption: result.caption,
                                    };
                                    await AsyncStorage.setItem(
                                        assetKey,
                                        JSON.stringify({
                                            tags: result.tags,
                                            quality: result.quality,
                                            caption: result.caption,
                                        })
                                    );
                                    analyzedAssets.push(enriched);
                                    continue;
                                }
                            } catch (retryError) {
                                console.error("Retry failed for asset:", assetKey, retryError);
                            }
                        } else {
                            console.error("Error analyzing asset:", assetKey, error);
                        }
    
                        analyzedAssets.push(asset);
                    }
    
                    await sleep(RATE_LIMIT_DELAY);
                } catch (err) {
                    console.error("Unexpected error processing asset:", assetKey, err);
                    analyzedAssets.push(asset);
                }
            }
    
            generateHighlights(analyzedAssets);
        } catch (e) {
            console.error("Unexpected error during asset analysis:", e);
        } finally {
            setIsAnalyzing(false);
        }
    };    

    useEffect(() => {
        insertTagsToAssets();
    }, [assets]);

    const generateHighlights = (analyzed: any) => {
        const tagGroups: { [tag: string]: any[] } = {};
        analyzed.forEach((img : any) => {
            if (img.tags && img.tags.length > 0) {
                img.tags.forEach((tag : any)=> {
                    if (!tagGroups[tag]) tagGroups[tag] = [];
                    tagGroups[tag].push(img);
                });
            }
        });

        const newHighlights: any = [];
        
        // Add tag-based highlights
        Object.keys(tagGroups).forEach(tag => {
            if (tagGroups[tag].length >= 2) { // Only create highlights with at least 2 images
            newHighlights.push({
                id: `tag-${tag}-${Date.now()}`,
                title: `${tag.charAt(0).toUpperCase() + tag.slice(1)} collection`,
                images: tagGroups[tag].slice(0, 10), // Limit to 10 images per highlight
                type: 'tag',
            });
            }
        });

        setHighlights(newHighlights);
    };

    const handleHighlightPress = (highlights: any, highlightTitle: string) => {
        navigation.navigate('ShowHighlights', { highlights, highlightTitle });
    };

    const renderHighlight = ({ item }: { item: any }) => {
        const randomIndex = Math.floor(Math.random() * item.images.length);
        const coverImage = item.images[randomIndex];

        return (
            <Animated.View entering={FadeInRight.delay(200).duration(1000)}>
            <TouchableOpacity
                onPress={() => handleHighlightPress(highlights, item.title)}
                style={[
                    styles.highlightContainer, 
                    currentTheme === 'dark' ? { backgroundColor: colors.white } : { backgroundColor: colors.darkGray }
                ]}
            >
                <View style={styles.highlightImagesContainer}>
                    {/* Main cover image */}
                    <Image 
                        source={{ uri: coverImage.uri || getImagekitUrlFromPath(`${userId}/${coverImage.name}`, [{ width: 500 }]) }} 
                        style={styles.highlightCoverImage}
                    />
                    
                    {/* Small preview images */}
                    <View style={styles.highlightPreviewContainer}>
                        {item.images.slice(1, 3).map((image: any, index: number) => (
                            <Image 
                                key={`preview-${index}`}
                                source={{ uri: image.uri || getImagekitUrlFromPath(`${userId}/${image.name}`, [{ width: 500 }]) }} 
                                style={styles.highlightPreviewImage}
                            />
                        ))}
                    </View>
                </View>
                
                <Text 
                    style={[
                        styles.highlightTitle, 
                        currentTheme === 'dark' ? { color: colors.black } : { color: colors.white }
                    ]}
                >
                        {item.title}
                </Text>
                <Text 
                    style={[
                        styles.highlightSubtitle,
                        currentTheme === 'dark' ? { color: colors.black } : { color: colors.white }
                    ]}
                >
                    {item.images.length} photos
                </Text>
            </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View 
            style={[
                styles.section, 
                { backgroundColor: bgColor }
            ]}
        >
            <Text style={[styles.sectionTitle, { color : textColor}]}>Highlights Created By AI</Text>
            {highlights.length === 0 && !isAnalyzing ? (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyStateText, { color : textColor}]}>
                        No highlights yet. Add more photos to generate AI-powered collections.
                    </Text>
                </View>
            ) : isAnalyzing ? (
                <ActivityIndicator 
                    size="large" 
                    style={styles.emptyState} 
                />
            ) : (
                <FlatList
                    data={highlights}
                    renderItem={renderHighlight}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.highlightsList}
                />
            )}
        </View>
    )
};

export default Highlights;

const styles = StyleSheet.create({
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginHorizontal: 16,
        marginVertical: 8,
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
    },
    emptyStateText: {
        textAlign: 'center',
    },
    highlightsList: {
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 8,
    },
    highlightContainer: {
        width: 200,
        marginRight: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        overflow: 'hidden',
    },
    highlightImagesContainer: {
        position: 'relative',
        height: 140,
    },
    highlightCoverImage: {
        width: '100%',
        height: 140,
    },
    highlightPreviewContainer: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        flexDirection: 'column',
    },
    highlightPreviewImage: {
        width: 40,
        height: 40,
        borderRadius: 4,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#fff',
    },
    highlightTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 12,
        marginTop: 8,
    },
    highlightSubtitle: {
        fontSize: 12,
        marginHorizontal: 12,
        marginBottom: 12,
        marginTop: 2,
    },
});