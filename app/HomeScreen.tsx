import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import Header from './components/Header';
import ShowAllAssets from './components/ShowAllAssets';

const HomeScreen = () => {
    return (
        <View style={styles.root}>
            <Header />
            <ShowAllAssets />
            <StatusBar style="auto" />
        </View>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
});