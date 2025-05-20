import ImageKit from 'imagekit-javascript';

const urlEndpoint = process.env.EXPO_PUBLIC_IMAGEKIT_URL_ENDPOINT || '';
const publicKey = process.env.EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY;

const imagekit = new ImageKit({
    urlEndpoint,
    publicKey,
});

export const getImagekitUrlFromPath = function (
    imagePath: string,
    transformationArray: any[],
) {
    const ikOptions = {
        urlEndpoint,
        path: imagePath,
        transformation: transformationArray,
    };

    const imageURL = imagekit.url(ikOptions);
    
    return imageURL;
};