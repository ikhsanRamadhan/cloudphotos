import { FlatList, Pressable, Text, Touchable, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native-paper';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useTheme } from '../../providers/ThemeProvider';
import { useMedia } from '../../providers/MediaProvider';
import { colors } from '../../utils/colors';
import { getImagekitUrlFromPath } from '../../utils/imagekit';
import AssetViewer from './AssetViewer';
import Highlights from './Highlights';

const ShowAllAssets = () => {
    const { currentTheme, textColor, bgColor } = useTheme();
    const { 
        userId, 
        assets, 
        localAssets, 
        numColumns, 
        itemSize, 
        uploadedCount, 
        loading,
        fetchAssets,
    } = useMedia();
    const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
    const [fullscreenVisible, setFullscreenVisible] = useState(false);
    const [fullscreenIndex, setFullscreenIndex] = useState(0);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        if (assets && assets.length > 0) {
            applyFilter(activeFilter);
        }
    }, [assets]);
    
    const applyFilter = (filterBy : string) => {
        if (filterBy === 'local') {
            setFilteredAssets(assets.filter(asset => asset.isLocalAsset));
        } else if (filterBy === 'cloud') {
            setFilteredAssets(assets.filter(asset => !asset.isLocalAsset));
        } else if (filterBy === 'backed-up') {
            setFilteredAssets(assets.filter(asset => asset.isLocalAsset && asset.isBackedUp));
        } else {
            // 'all' filter
            setFilteredAssets(assets);
        }
    };

    const handleImagePress = (index : number) => {
        setFullscreenIndex(index);
        setFullscreenVisible(true);
    };

    const handleCloseFullscreen = () => {
        setFullscreenVisible(false);
    };

    const handleFilterChange = (filterBy : string) => {
        setActiveFilter(filterBy);
        applyFilter(filterBy);
    };

    const FilterButton = ({ title, filterValue } : { title: string, filterValue: string }) => (
        <TouchableOpacity
            onPress={() => handleFilterChange(filterValue)}
            style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                marginHorizontal: 4,
                backgroundColor: activeFilter === filterValue 
                    ? (currentTheme === 'dark' ? colors.gray : colors.darkGray) 
                    : (currentTheme === 'dark' ? colors.darkGray : colors.gray),
                borderRadius: 20,
            }}
        >
            <Text style={{ 
                color: activeFilter === filterValue 
                    ? (currentTheme === 'dark' ? colors.black : colors.white) 
                    : (currentTheme === 'dark' ? colors.white : colors.black),
                fontWeight: activeFilter === filterValue ? 'bold' : 'normal',
            }}>
                {title}
            </Text>
        </TouchableOpacity>
    );
    
    if (loading) {
        return (
            <ActivityIndicator 
                size="large" 
                style={{ 
                    flex: 1, 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    backgroundColor: bgColor
                }} 
            />
        );
    }

    return (
        <>
        <View style={{ flex: 1, backgroundColor: currentTheme === 'dark' ? colors.dark : colors.gray }}>
            {/* Header */}
            <View>
                <Text
                    style={{
                        textAlign: 'center',
                        padding: 8,
                        backgroundColor: bgColor,
                        color: textColor,
                        zIndex: 1000,
                    }}
                >
                    Backed Up: {uploadedCount} / {localAssets.length} local assets
                </Text>
            </View>
            
            {/* Filter Buttons */}
            <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-evenly', 
                padding: 10,
                backgroundColor: bgColor,
            }}>
                <FilterButton title="All" filterValue="all" />
                <FilterButton title="Local" filterValue="local" />
                <FilterButton title="Cloud" filterValue="cloud" />
                <FilterButton title="Backed Up" filterValue="backed-up" />
            </View>
            
            {/* FlatList to display assets */}
            <FlatList
                data={filteredAssets}
                keyExtractor={item => item.id}
                numColumns={numColumns}
                columnWrapperStyle={{ gap: 2 }}
                onEndReached={fetchAssets}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={() => (
                    <View style={{ flex: 1 }}>
                        <Highlights />
                    </View>
                )}
                renderItem={({ item, index }) => (
                    <Pressable onPress={() => handleImagePress(index)}>
                        <Image
                            source={{ 
                                uri: item.isLocalAsset
                                ? item.uri
                                : getImagekitUrlFromPath(
                                    `${userId}/${item.name}`,
                                    [{ height: itemSize }]
                                )
                            }}
                            style={{ width: itemSize, height: itemSize, aspectRatio: 1 }}
                        />
                        {!item.isBackedUp && item.isLocalAsset ? (
                        <FontAwesome
                            name="cloud-upload" 
                            size={18} 
                            color={colors.white}
                            style={{
                                position: 'absolute',
                                right: 6,
                                bottom: 6,
                                textShadowColor: 'rgba(0,0,0,0.7)',
                                textShadowRadius: 3,
                            }}
                        />
                        ) : item.isBackedUp ? null : (
                        <FontAwesome
                            name="cloud" 
                            size={18} 
                            color={colors.white}
                            style={{
                                position: 'absolute',
                                right: 6,
                                bottom: 6,
                                textShadowColor: 'rgba(0,0,0,0.7)',
                                textShadowRadius: 3,
                            }}
                        />
                        )}
                    </Pressable>
                )}
                contentContainerStyle={{
                    backgroundColor: currentTheme === 'dark' ? colors.dark : colors.gray,
                    gap: 1.5,
                }}
                style={{ 
                    flex: 1,
                    backgroundColor: currentTheme === 'dark' ? colors.dark : colors.gray
                }}
            />
        </View>
        {fullscreenVisible && (
            <AssetViewer
                visible={fullscreenVisible}
                initialIndex={fullscreenIndex}
                onClose={handleCloseFullscreen}
            />
        )}
        </>
    );
};

export default ShowAllAssets;