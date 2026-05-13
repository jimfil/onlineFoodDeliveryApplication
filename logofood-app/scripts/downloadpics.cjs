const fs = require('fs');
const https = require('https');
const path = require('path');

const targetDirectory = path.join(__dirname, '../public/images/categories');

// Fresh links for the 4 that failed
const retryData = [
    { file: 'salads.jpg', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80' },
    { file: 'crepes.jpg', url: 'https://images.unsplash.com/photo-1596450514735-111a2fe02935?w=500&q=80' }
];

const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        // We added a "User-Agent" header here to prevent Unsplash from blocking the request
        const options = {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        };
        https.get(url, options, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else if (res.statusCode === 302 || res.statusCode === 301) {
                // If Unsplash tries to redirect, follow the redirect!
                downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
            } else {
                res.resume();
                reject(new Error(`Failed with Status Code: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
};

async function runRetry() {
    console.log('🚀 Retrying the 4 failed images...\n');
    for (const item of retryData) {
        const filePath = path.join(targetDirectory, item.file);
        try {
            await downloadImage(item.url, filePath);
            console.log(`✅ Downloaded: ${item.file}`);
        } catch (error) {
            console.error(`❌ Still failing on ${item.file}:`, error.message);
        }
    }
    console.log('\n🎉 Patch complete!');
}

runRetry();