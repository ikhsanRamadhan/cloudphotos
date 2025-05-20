import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    Easing, 
    cancelAnimation,
    runOnJS 
} from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';

import { useMedia } from '../../providers/MediaProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { colors } from '../../utils/colors';
import { getImagekitUrlFromPath } from '../../utils/imagekit';
import { RootStackParamList } from '../../utils/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ShowHighlights'>;

const ShowHighlights = () => {
    const { textColor, bgColor } = useTheme();
    const { userId } = useMedia();
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const { highlights, highlightTitle } = route.params as { highlights: any[]; highlightTitle: string };
    const foundIndex = highlights.findIndex((highlight: any) => highlight.title === highlightTitle);
    const validIndex = foundIndex === -1 ? 0 : foundIndex;
    const [currentIndex, setCurrentIndex] = useState(validIndex);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [currentHighlight, setCurrentHighlight] = useState(highlights[validIndex]);
    const [shouldNavigateHome, setShouldNavigateHome] = useState(false);
    const progress = useSharedValue(0);
    const isPaused = useRef(false);
    const imageOpacity = useSharedValue(0);
    const [currentDuration, setCurrentDuration] = useState(5000);
    const video = useRef<Video>(null);
    const [status, setStatus] = useState<any>({});

    const goToPrevHighlight = () => {
        cancelAnimation(progress);
        
        setHighlightIndex((index) => {
            if (index === 0) {
                if (currentIndex === 0) {
                    setShouldNavigateHome(true);
                    return 0;
                } else {
                    setCurrentIndex(currentIndex - 1);
                    return highlights[currentIndex - 1].images.length - 1;
                }
            }
            return index - 1;
        });
    };

    const goToNextHighlight = () => {
        cancelAnimation(progress);
        
        setHighlightIndex((index) => {
            if (index === currentHighlight.images.length - 1) {
                if (currentIndex === highlights.length - 1) {
                    setShouldNavigateHome(true);
                    return index;
                } else {
                    setCurrentIndex(currentIndex + 1);
                    return 0;
                }
            }
            return index + 1;
        });
    };

    const handleProgressFinished = () => {
        goToNextHighlight();
    };

    const startProgressAnimation = (duration: number) => {
        progress.value = 0;
        progress.value = withTiming(
            1,
            {
                duration,
                easing: Easing.linear
            },
            (finished) => {
                if (finished) {
                    runOnJS(handleProgressFinished)();
                }
            }
        );
    };    

    useEffect(() => {
        if (highlights[currentIndex]) {
            setCurrentHighlight(highlights[currentIndex]);
            setHighlightIndex(0);
        }
    }, [currentIndex, highlights]);

    useEffect(() => {
        if (shouldNavigateHome) {
            navigation.navigate('HomeScreen');
            setShouldNavigateHome(false);
        }
    }, [shouldNavigateHome, navigation]);

    useEffect(() => {
        cancelAnimation(progress);
        imageOpacity.value = 0;
    
        const currentImage = highlights[currentIndex]?.images?.[highlightIndex];
        const duration = currentImage?.duration ?? 0;
        const durationMs = duration > 0 ? duration * 1000 : 5000;
    
        setCurrentDuration(durationMs);
    
        setTimeout(() => {
            imageOpacity.value = withTiming(1, { duration: 300 });
        }, 50);
    
        const timer = setTimeout(() => {
            startProgressAnimation(durationMs);
        }, 60);
    
        return () => {
            cancelAnimation(progress);
            clearTimeout(timer);
        };
    }, [highlightIndex, currentIndex]);    

    const indicatorAnimatedStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const imageAnimatedStyle = useAnimatedStyle(() => ({
        opacity: imageOpacity.value,
    }));

    const handlePressIn = () => {
        isPaused.current = true;
        cancelAnimation(progress);
        video.current?.pauseAsync();
    };

    const handlePressOut = () => {
        isPaused.current = false;
        const remainingDuration = (1 - progress.value) * currentDuration;
    
        progress.value = withTiming(
            1,
            {
                duration: Math.max(remainingDuration, 300),
                easing: Easing.linear
            },
            (finished) => {
                if (finished) {
                    runOnJS(handleProgressFinished)();
                }
            }
        );
        video.current?.playAsync();
    };

    const isCurrentAssetVideo = useCallback(() => {
        if (!currentHighlight || !currentHighlight.images[highlightIndex]) return false;
        const asset = currentHighlight.images[highlightIndex];
        
        return (
            (asset.mediaType === 'video') || 
            (asset.metadata?.mediaType === 'video') ||
            (asset.uri && asset.uri.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i))
        );
    }, [currentHighlight, highlightIndex]);

    const isVideo = isCurrentAssetVideo();

    if (!currentHighlight || !currentHighlight.images || currentHighlight.images.length === 0) {
        return (
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: textColor }}>
                    No images found for this highlight.
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
            <View style={[styles.container, { backgroundColor: bgColor }]}>
                {currentHighlight?.images?.[highlightIndex] && (
                    <Animated.View style={[styles.imageWrapper, imageAnimatedStyle]}>
                        {!isVideo ? (
                            <Image 
                                style={styles.image} 
                                source={{ 
                                    uri: currentHighlight.images[highlightIndex].uri 
                                        || getImagekitUrlFromPath(`${userId}/${currentHighlight.images[highlightIndex].name}`, [{ width: 500 }]) 
                                }}
                                contentFit='contain'
                            />
                        ) : (
                            <Video
                                ref={video}
                                style={styles.image}
                                source={{
                                    uri: currentHighlight.images[highlightIndex].uri 
                                        || getImagekitUrlFromPath(`${userId}/${currentHighlight.images[highlightIndex].name}`, [{ width: 500 }])
                                }}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                isLooping
                                onPlaybackStatusUpdate={status => setStatus(() => status)}
                                shouldPlay
                            />
                        )}
                    </Animated.View>
                )}

                <Pressable 
                    style={[styles.navPressable, {alignSelf: 'flex-start'}]} 
                    onPress={goToPrevHighlight}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                />

                <Pressable 
                    style={[styles.navPressable, {alignSelf: 'flex-end'}]} 
                    onPress={goToNextHighlight}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                />

                <Pressable 
                    style={[styles.navPressable, {alignSelf: 'center'}]} 
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                />

                <View style={styles.header}>
                    <LinearGradient
                        colors={[colors.dark, 'transparent']}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.indicatorRow}>
                        {currentHighlight.images.map((image: any, index: number) => (
                            <View key={`indicator-${index}`} style={styles.indicatorBG}>
                                {index === highlightIndex ? (
                                    <Animated.View
                                        style={[
                                            styles.indicator,
                                            indicatorAnimatedStyle
                                        ]}
                                    />
                                ) : (
                                    <View 
                                        style={[
                                            styles.indicator,
                                            { width: index < highlightIndex ? '100%' : 0 }
                                        ]}
                                    />
                                )}
                            </View>
                        ))}
                    </View>

                    <Text style={[styles.title, { color: colors.white }]}>{currentHighlight.title}</Text>
                </View>
            </View>
        </SafeAreaView>
    )
};

export default ShowHighlights;

const styles = StyleSheet.create({
    container : {
        flex: 1,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    header : {
        position: 'absolute',
        top: 0,
        width: '100%',
        padding: 20,
        paddingTop: 60,
    },
    title : {
        fontWeight: 'bold',
        fontSize: 20,
    },
    navPressable : {
        position: 'absolute',
        width: '30%',
        height: '100%',
    },
    indicatorRow : {
        gap: 5,
        flexDirection: 'row',
        marginBottom: 10,
    },
    indicatorBG : {
        flex: 1,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 10,
        overflow: 'hidden',
    },
    indicator : {
        backgroundColor: 'white',
        height: '100%',
    },
    imageWrapper : {
        flex: 1,
    }
});