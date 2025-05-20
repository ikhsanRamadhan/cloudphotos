import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './app/HomeScreen';
import Login from './app/(auth)/login';
import ShowHighlights from './app/components/ShowHighlights';
import { useAuth } from './providers/AuthProvider';
import { RootStackParamList } from './utils/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigation = () => {
    const { session } = useAuth();

    return (
        <Stack.Navigator>
            {session ? (
                <>
                    <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="ShowHighlights" component={ShowHighlights} options={{ headerShown: false }} />
                </>
            ) : (
                <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            )}
        </Stack.Navigator>
    );
};

export default Navigation;