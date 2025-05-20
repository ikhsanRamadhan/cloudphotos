import { useState } from 'react';
import { Alert, View, Text } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';

import { supabase } from '../../utils/supabase';
import { useTheme } from '../../providers/ThemeProvider';

export default function Auth() {
    const { bgColor, textColor } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signInWithEmail() {
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        })

        if (error) Alert.alert(error.message)
        setLoading(false)
    }

    async function signUpWithEmail() {
        setLoading(true)
        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email: email,
            password: password,
        })

        if (error) Alert.alert(error.message)
        if (!session) Alert.alert('Please check your inbox for email verification!')
        setLoading(false)
    }

    return (
        <View 
            style={{ 
                backgroundColor: bgColor,
                paddingBottom: 50,
                paddingTop: 80,
                paddingHorizontal: 10,
                height: '100%',
                justifyContent: 'flex-start',
                gap: 10
            }}
        >
            <Image 
                source={require('../../assets/splash-icon.png')}
                style={{ width: 200, height: 200, alignSelf: 'center' }}
            />
            <Text
                style={{ 
                    color: textColor,
                    fontSize: 30,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginTop: 10,
                    marginBottom: 10
                }}
            >
                Login
            </Text>

            <TextInput
                onChangeText={(text: string) => setEmail(text)}
                value={email}
                placeholder="email@address.com"
                autoCapitalize={'none'}
                left={
                    <TextInput.Icon
                        icon={() => <Feather name="user" size={20} color="#666" />}
                    />
                }
                style={{ backgroundColor: 'white', }}
                mode='outlined'
                outlineColor='#3b82f6'
                activeOutlineColor='#3b82f6'
                textColor='black'
            />

            <TextInput
                onChangeText={(text: string) => setPassword(text)}
                value={password}
                secureTextEntry={true}
                placeholder="Password"
                autoCapitalize={'none'}
                left={
                    <TextInput.Icon
                        icon={() => <Feather name="lock" size={20} color="#666" />}
                    />
                }
                style={{ backgroundColor: 'white' }}
                mode='outlined'
                outlineColor='#3b82f6'
                activeOutlineColor='#3b82f6'
                textColor='black'
            />

            <View style={{ gap: 10, paddingHorizontal: 50, marginTop: 20 }}>
                <Button 
                    disabled={loading} 
                    onPress={() => signInWithEmail()}
                    style={{ backgroundColor: '#3b82f6' }}
                    mode="contained"
                    textColor='white'
                    loading={loading}
                >
                    Sign in
                </Button>

                <Button
                    disabled={loading} 
                    onPress={() => signUpWithEmail()}
                    textColor='#3b82f6'
                    mode="outlined"
                    loading={loading}
                    style={{ borderColor: '#3b82f6' }}
                >
                    Sign up
                </Button>
            </View>

        </View>
    )
};