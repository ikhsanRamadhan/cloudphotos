import { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    PanResponder,
    BackHandler,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useWindowDimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Octicons from '@expo/vector-icons/Octicons';

import { getImagekitUrlFromPath } from '../../utils/imagekit';
import { useMedia } from '../../providers/MediaProvider';
import { useTheme } from '../../providers/ThemeProvider';
import DetailsModal from './Modal/DetailsModal';

type AssetViewerProps = {
    visible: boolean;
    initialIndex: number;
    onClose: () => void;
};

const AssetViewer = ({ visible, initialIndex, onClose }: AssetViewerProps) => {
    const { 
        userId, 
        assets, 
        isLoadingUpload, 
        isLoadingDelete, 
        syncAssetsToCloud, 
        deleteAssetFromCloud,
        shareLocalImage,
        shareImageFromUrl,
    } = useMedia();
    const { textColor, bgColor } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const { width, height } = useWindowDimensions();
    const [imageError, setImageError] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [status, setStatus] = useState<any>({});
    const [indexModal, setIndexModal] = useState(0);
    const [bottomBarBottom, setBottomBarBottom] = useState(0);
    const video = useRef<Video>(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    
    // Refs to track current state values that can be accessed in animations
    const currentIndexRef = useRef(initialIndex);
    const isAnimatingRef = useRef(false);
    const isMountedRef = useRef(true);
    const animationRef = useRef<Animated.CompositeAnimation | null>(null);

    const handleOpenModal = useCallback(() => {
        bottomSheetModalRef.current?.present();
        video.current?.pauseAsync();
    }, []);

    const handleSheetChanges = useCallback((index: number) => {
        setIndexModal(index);
    }, []);

    const fadeIn = () => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };
    
    const fadeOut = (onComplete?: () => void) => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            if (onComplete) onComplete();
        });
    };

    useEffect(() => {
        if (indexModal < 0) {
            video.current?.playAsync();
        };
    }, [indexModal]);

    // Setup cleanup function and back handler
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (visible) {
                if (animationRef.current) {
                    animationRef.current.stop();
                }
                onClose();
                return true;
            }
            return false;
        });
        
        return () => {
            backHandler.remove();
            
            isMountedRef.current = false;
            
            if (animationRef.current) {
                animationRef.current.stop();
                animationRef.current = null;
            }
        };
    }, [visible, onClose]);

    useEffect(() => {
        if (!assets || assets.length === 0) return;
    
        const safeIndex = Math.min(Math.max(0, currentIndex), assets.length - 1);
        if (currentIndex !== safeIndex && isMountedRef.current) {
            setCurrentIndex(safeIndex);
            currentIndexRef.current = safeIndex;
        }

        setBottomBarBottom(0);
    }, [currentIndex, assets]);  
    
    // Update refs when state changes
    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);
    
    useEffect(() => {
        isAnimatingRef.current = isAnimating;
    }, [isAnimating]);
    
    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            currentIndexRef.current = initialIndex;
            setImageError(false);
            setIsAnimating(false);
            isAnimatingRef.current = false;
            fadeAnim.setValue(0);
            fadeIn();
        }
    }, [initialIndex, visible]);    
    
    // Animation values
    const position = useRef(new Animated.ValueXY()).current;
    
    // Safe state update function
    const safeSetState = useCallback((setter: any, value: any) => {
        if (isMountedRef.current) {
            setter(value);
        }
    }, []);
    
    // Create the pan responder with useCallback to avoid recreating it unnecessarily
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                const currentIsAtFirstImage = currentIndexRef.current <= 0;
                const currentIsAtLastImage = currentIndexRef.current >= (assets?.length - 1 || 0);
                
                if ((currentIsAtFirstImage && gestureState.dx > 0) || (currentIsAtLastImage && gestureState.dx < 0)) {
                    position.setValue({ 
                        x: gestureState.dx / 3,
                        y: 0 
                    });
                } else {
                    position.setValue({ x: gestureState.dx, y: 0 });
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (isAnimatingRef.current || !isMountedRef.current) return;
                
                const threshold = width / 3;
                
                const currentIdx = currentIndexRef.current;
                const canGoNext = currentIdx < (assets?.length - 1);
                const canGoPrevious = currentIdx > 0;
                
                if (gestureState.dx < -threshold && canGoNext) {
                    handleSlide(1);
                } else if (gestureState.dx > threshold && canGoPrevious) {
                    handleSlide(-1);
                } else {
                    handleResetPosition();
                }
            },
        })
    ).current;

    const handleSlide = useCallback((direction: number) => {
        if (isAnimatingRef.current || !isMountedRef.current) return;
        
        const currentIdx = currentIndexRef.current;
        
        if (direction < 0 && currentIdx <= 0) {
            handleResetPosition();
            return;
        }
        
        if (direction > 0 && currentIdx >= (assets?.length - 1)) {
            handleResetPosition();
            return;
        }
        
        safeSetState(setIsAnimating, true);
        isAnimatingRef.current = true;
        
        const newIndex = Math.max(0, Math.min(currentIdx + direction, (assets?.length - 1) || 0));
        
        const slideAnimation = Animated.timing(position, {
            toValue: { x: -width * direction, y: 0 },
            duration: 200,
            useNativeDriver: false,
        });
        
        animationRef.current = slideAnimation;
        
        slideAnimation.start(() => {
            if (!isMountedRef.current) return;
        
            fadeOut(() => {
                safeSetState(setCurrentIndex, newIndex);
                safeSetState(setImageError, false);
        
                position.setValue({ x: 0, y: 0 });
        
                fadeIn();
        
                safeSetState(setIsAnimating, false);
                isAnimatingRef.current = false;
                animationRef.current = null;
            });
        });        
    }, [assets?.length, position, width, safeSetState]);

    const handleResetPosition = useCallback(() => {
        if (isAnimatingRef.current || !isMountedRef.current) return;
        
        safeSetState(setIsAnimating, true);
        isAnimatingRef.current = true;
        
        const resetAnimation = Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
        });
        
        animationRef.current = resetAnimation;
        
        resetAnimation.start(() => {
            if (!isMountedRef.current) return;
            
            safeSetState(setIsAnimating, false);
            isAnimatingRef.current = false;
            animationRef.current = null;
        });
    }, [position, safeSetState]);

    // Calculate the image URI safely
    const getImageUri = useCallback(() => {
        if (!assets || !assets[currentIndex]) return '';
        
        const currentAsset = assets[currentIndex];
        try {
            return currentAsset.isLocalAsset
                ? currentAsset.uri
                : getImagekitUrlFromPath(
                    `${userId}/${currentAsset.name}`,
                    [{ width: 500 }]
                );
        } catch (error) {
            console.error("Error getting image URI:", error);
            return '';
        }
    }, [assets, currentIndex, userId]);

    const isCurrentAssetVideo = useCallback(() => {
        if (!assets || !assets[currentIndex]) return false;
        const asset = assets[currentIndex];
        
        return (
            (asset.mediaType === 'video') || 
            (asset.metadata?.mediaType === 'video') ||
            (asset.uri && asset.uri.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i))
        );
    }, [assets, currentIndex]);

    const shareAsset = (asset: any, imageUri: string) => {
        if (asset.isLocalAsset) {
            shareLocalImage(imageUri);
        } else {
            shareImageFromUrl(imageUri, asset.id);
        }
    };

    // Handle visibility and missing data cases
    if (!visible || !assets || assets.length === 0) return null;  

    // Get image URI
    const imageUri = getImageUri();
    const isVideo = isCurrentAssetVideo();

    useEffect(() => {
        const timer = setTimeout(() => {
            setBottomBarBottom(0);
        }, 3000);

        return () => clearTimeout(timer);
    }, [bottomBarBottom]);

    return (
        <View 
            style={[
                styles.container,
                { backgroundColor: bgColor },
            ]}
        >
            <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => {
                    if (animationRef.current) {
                        animationRef.current.stop();
                    }
                    onClose();
                }}
                hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
                <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            
            {/* Image counter */}
            <View style={styles.counter}>
                <FontAwesome name="image" size={16} color={textColor} style={{ marginRight: 8 }} />
                <Text style={[styles.counterText, { color: textColor }]}>
                    {`${currentIndex + 1} / ${assets.length}`}
                </Text>
            </View>

            <View style={styles.uploadIcon}>
                <Entypo 
                    name="dots-three-vertical" 
                    size={24} 
                    color={textColor}
                    onPress={() => handleOpenModal()}
                />
            </View>
            
            {/* Image with pan responder */}
            <Animated.View
                style={[
                    styles.imageContainer,
                    { 
                        transform: position.getTranslateTransform(),
                        width: width,
                        height: height 
                    },
                ]}
                {...panResponder.panHandlers}
            >
                <Animated.View style={{ opacity: fadeAnim, width: '100%', height: '100%' }}>
                    {imageError ? (
                        <View style={styles.errorContainer}>
                            <FontAwesome name="exclamation-circle" size={50} color={textColor} />
                            <Text style={[styles.errorText, { color: textColor }]}>Error loading media</Text>
                        </View>
                    ) : isVideo ? (
                        <Video
                            ref={video}
                            style={styles.image}
                            source={{ uri: imageUri }}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            isLooping
                            onPlaybackStatusUpdate={status => setStatus(() => status)}
                            shouldPlay
                            onTouchStart={() => {
                                setBottomBarBottom(30);
                            }}
                            
                        />
                    ) : (
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.image}
                            contentFit="contain"
                            onError={() => {
                                console.error("Image failed to load:", imageUri);
                                if (isMountedRef.current) {
                                    setImageError(true);
                                }
                            }}
                            cachePolicy="memory-disk"
                        />
                    )}
                </Animated.View>
            </Animated.View>

            <View style={[styles.bottomBar, { bottom: bottomBarBottom }]}>
                <View style={styles.bottomButton}>
                    <Octicons 
                        onPress={() => shareAsset(assets[currentIndex], imageUri)}
                        name="share-android"
                        size={24}
                        color={textColor}
                        style={styles.bottomButton}
                    />
                    <Text style={[styles.textBottomButtom, { color: textColor }]}>Share</Text>
                </View>

                {assets[currentIndex].isLocalAsset && !assets[currentIndex].isBackedUp ? (
                    isLoadingUpload ? (
                        <View style={styles.bottomButton}>
                            <ActivityIndicator
                                size="large"
                                color={textColor}
                            />
                        </View>
                    ) : (
                        <View style={styles.bottomButton}>
                            <Entypo
                                onPress={() => syncAssetsToCloud(assets[currentIndex])}
                                name="upload-to-cloud"
                                size={24}
                                color={textColor}
                            />
                            <Text style={[styles.textBottomButtom, { color: textColor }]}>Sync to cloud</Text>
                        </View>
                    )
                ) : (
                    isLoadingDelete ? (
                        <View style={styles.bottomButton}>
                            <ActivityIndicator
                                size="large"
                                color={textColor}
                            />
                        </View>
                    ) : (
                        <View style={styles.bottomButton}>
                            <FontAwesome5
                                onPress={() => deleteAssetFromCloud(assets[currentIndex])}
                                name="trash-alt"
                                size={24}
                                color={textColor}
                            />
                            <Text style={[styles.textBottomButtom, { color: textColor }]}>Delete from cloud</Text>
                        </View>
                    )
                )}
            </View>

            <DetailsModal 
                bottomSheetModalRef={bottomSheetModalRef} 
                handleSheetChanges={handleSheetChanges} 
                asset={assets[currentIndex]} 
                indexModal={indexModal}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 15,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        left: 5,
        zIndex: 1100,
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    counter: {
        position: 'absolute',
        top: 40,
        zIndex: 1100,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    uploadIcon: {
        position: 'absolute',
        top: 40,
        right: 5,
        zIndex: 1100,
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        flexDirection: 'row',
        gap: 15
    },
    counterText: {
        fontWeight: 'bold',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        marginTop: 10,
        fontSize: 16,
    },
    leftButton : {
        flexDirection: 'row',
        gap: 10,
        position: 'absolute',
        paddingRight: 30
    },
    bottomBar : {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 150,
        backgroundColor: 'transparent',
        padding: 20,
        paddingBottom: 60,
        alignItems: 'center',
        justifyContent: 'space-around',
        flexDirection: 'row'
    },
    bottomButton : {
        flexDirection: 'column', 
        alignItems: 'center',
        gap: 10,
    },
    textBottomButtom : {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '500'
    }
});

export default AssetViewer;