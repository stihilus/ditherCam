// Global variables for camera and canvas
let video, canvas, ctx;
let isProcessing = false;
let animationFrameId = null;

// Settings state
const settings = {
    ditheringType: 'ordered',
    colorPalette: 'obra-dinn',
    ditheringSize: 5,
    brightness: 0,
    contrast: 0
};

// Color palettes (using your full palette list)
const colorPalettes = {
    'bw': ['#ffffff', '#000000'],
    'obra-dinn': ['#333319', '#e5ffff'],
    'cga': ['#ffffff', '#000000', '#58FFFB', '#EF2AF8', '#58FF4E', '#EE374B', '#FDFF52'],
    'amiga': ['#000020', '#D02020', '#0050A0', '#F0F0F0', '#F08000'],
    'rgb-dither': ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000'],
    'cmyk-dither': ['#00ffff', '#ff00ff', '#ffff00', '#000000'],
    '3-bit-dither': ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'],
    'gameboy': ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
    'teletext': ['#000000', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff'],
    'apple-ii': ['#000000', '#722640', '#40337f', '#e434fe', '#0e5940', '#808080', '#1b9afe', '#bfbfbf', '#404c00', '#dd6f57', '#808080', '#f1a6bf', '#1bcb01', '#bfcc80', '#85d2e3', '#ffffff'],
    'commodore-64': ['#000000', '#626262', '#898989', '#adadad', '#ffffff', '#9f4e44', '#cb7e75', '#6d5412', '#a1683c', '#c9d487', '#9ae29b', '#5cab5e', '#6abfc6', '#887ecb', '#50459b', '#a057a3'],
    'zx-spectrum': ['#000000', '#0000D7', '#D70000', '#D700D7', '#00D700', '#00D7D7', '#D7D700', '#D7D7D7'],
    '6-bit-rgb': ['#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA', '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'],
    'vaporwave': ['#FF6AD5', '#C774E8', '#AD8CFF', '#8795E8', '#94D0FF'],
    'hacker': ['#000000', '#00FF00']
};

// Initialize app
document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
    try {
        // Show startup animation
        await playStartupAnimation();
        await setupCamera();
        setupCanvas();
        setupEventListeners();
        startProcessing();
    } catch (err) {
        console.error('Failed to initialize:', err);
    }
}

async function setupCamera() {
    try {
        const screenWidth = window.innerWidth * window.devicePixelRatio;
        const screenHeight = window.innerHeight * window.devicePixelRatio;
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: 'environment',
                width: { ideal: screenWidth },
                height: { ideal: screenHeight }
            }
        });
        
        video = document.getElementById('camera');
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                resolve();
            };
        });
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Unable to access camera. Please make sure you have granted camera permissions.');
    }
}

function setupCanvas() {
    canvas = document.getElementById('output');
    ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    
    const captureCanvas = document.getElementById('captureCanvas');
    captureCanvas.width = canvas.width;
    captureCanvas.height = canvas.height;
}

function setupEventListeners() {
    // Random button
    document.getElementById('randomBtn').addEventListener('click', randomizeSettings);

    // Settings modal controls
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('active');
    });

    document.getElementById('closeSettings').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.remove('active');
    });

    // Settings changes
    document.getElementById('ditheringType').addEventListener('change', (e) => {
        settings.ditheringType = e.target.value;
    });

    document.getElementById('colorPalette').addEventListener('change', (e) => {
        settings.colorPalette = e.target.value;
    });

    document.getElementById('ditheringSize').addEventListener('input', (e) => {
        settings.ditheringSize = parseInt(e.target.value);
    });

    document.getElementById('brightness').addEventListener('input', (e) => {
        settings.brightness = parseInt(e.target.value);
    });

    document.getElementById('contrast').addEventListener('input', (e) => {
        settings.contrast = parseInt(e.target.value);
    });

    document.getElementById('captureBtn').addEventListener('click', captureImage);
}

function startProcessing() {
    if (isProcessing) return;
    isProcessing = true;
    processFrame();
}

function processFrame() {
    if (!isProcessing) return;

    // Calculate dimensions to fit canvas to video
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = canvas.width / canvas.height;
    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let drawX = 0;
    let drawY = 0;
    
    // Always fill the width and adjust height to maintain aspect ratio
    if (videoAspect > canvasAspect) {
        drawHeight = canvas.width / videoAspect;
        drawY = (canvas.height - drawHeight) / 2;
    } else {
        // If video is taller, fill the height and adjust width
        drawWidth = canvas.height * videoAspect;
        drawX = (canvas.width - drawWidth) / 2;
    }
    
    // Scale up to ensure no empty space
    const scale = Math.max(
        canvas.width / drawWidth,
        canvas.height / drawHeight
    );
    
    drawWidth *= scale;
    drawHeight *= scale;
    drawX = (canvas.width - drawWidth) / 2;
    drawY = (canvas.height - drawHeight) / 2;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame
    ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Apply effects
    applyBrightnessContrast(imageData);
    applyDithering(imageData);
    
    // Put processed image back to canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Request next frame
    animationFrameId = requestAnimationFrame(processFrame);
}

function applyBrightnessContrast(imageData) {
    const data = imageData.data;
    const factor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));

    for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            data[i + j] = factor * (data[i + j] - 128 + settings.brightness) + 128;
        }
    }
}

function applyDithering(imageData) {
    const palette = colorPalettes[settings.colorPalette];
    
    switch (settings.ditheringType) {
        case 'ordered':
            applyOrderedDithering(imageData, palette, settings.ditheringSize);
            break;
        case 'floyd-steinberg':
            applyFloydSteinbergDithering(imageData, palette, settings.ditheringSize);
            break;
        case 'atkinson':
            applyAtkinsonDithering(imageData, palette, settings.ditheringSize);
            break;
    }
}

function applyOrderedDithering(imageData, palette, ditheringSize) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const threshold = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];

    for (let y = 0; y < height; y += ditheringSize) {
        for (let x = 0; x < width; x += ditheringSize) {
            const idx = (y * width + x) * 4;
            const thresholdValue = threshold[(y / ditheringSize) % 4][(x / ditheringSize) % 4] / 16;

            const r = data[idx] / 255;
            const g = data[idx + 1] / 255;
            const b = data[idx + 2] / 255;

            const newR = r > thresholdValue ? 255 : 0;
            const newG = g > thresholdValue ? 255 : 0;
            const newB = b > thresholdValue ? 255 : 0;

            const [finalR, finalG, finalB] = findClosestColor(newR, newG, newB, palette);

            for (let dy = 0; dy < ditheringSize && y + dy < height; dy++) {
                for (let dx = 0; dx < ditheringSize && x + dx < width; dx++) {
                    const currentIdx = ((y + dy) * width + (x + dx)) * 4;
                    data[currentIdx] = finalR;
                    data[currentIdx + 1] = finalG;
                    data[currentIdx + 2] = finalB;
                }
            }
        }
    }
}

function applyFloydSteinbergDithering(imageData, palette, ditheringSize) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y += ditheringSize) {
        for (let x = 0; x < width; x += ditheringSize) {
            const idx = (y * width + x) * 4;
            const oldR = data[idx];
            const oldG = data[idx + 1];
            const oldB = data[idx + 2];
            
            const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);
            
            for (let dy = 0; dy < ditheringSize && y + dy < height; dy++) {
                for (let dx = 0; dx < ditheringSize && x + dx < width; dx++) {
                    const currentIdx = ((y + dy) * width + (x + dx)) * 4;
                    data[currentIdx] = newR;
                    data[currentIdx + 1] = newG;
                    data[currentIdx + 2] = newB;
                }
            }

            const errR = oldR - newR;
            const errG = oldG - newG;
            const errB = oldB - newB;

            if (x + ditheringSize < width) {
                data[idx + 4 * ditheringSize] = Math.min(255, Math.max(0, data[idx + 4 * ditheringSize] + errR * 7 / 16));
                data[idx + 4 * ditheringSize + 1] = Math.min(255, Math.max(0, data[idx + 4 * ditheringSize + 1] + errG * 7 / 16));
                data[idx + 4 * ditheringSize + 2] = Math.min(255, Math.max(0, data[idx + 4 * ditheringSize + 2] + errB * 7 / 16));
            }
            if (x - ditheringSize >= 0 && y + ditheringSize < height) {
                data[idx + width * 4 * ditheringSize - 4 * ditheringSize] = Math.min(255, Math.max(0, data[idx + width * 4 * ditheringSize - 4 * ditheringSize] + errR * 3 / 16));
                data[idx + width * 4 * ditheringSize - 4 * ditheringSize + 1] = Math.min(255, Math.max(0, data[idx + width * 4 * ditheringSize - 4 * ditheringSize + 1] + errG * 3 / 16));
                data[idx + width * 4 * ditheringSize - 4 * ditheringSize + 2] = Math.min(255, Math.max(0, data[idx + width * 4 * ditheringSize - 4 * ditheringSize + 2] + errB * 3 / 16));
            }
            if (y + ditheringSize < height) {
                data[idx + width * 4 * ditheringSize] = Math.min(255, Math.max(0, data[idx + width * 4 * ditheringSize] + errR * 5 / 16));
                data[idx + width * 4 * ditheringSize + 1] = Math.min(255, Math.max(0, data[idx + width * 4 * ditheringSize + 1] + errG * 5 / 16));
                data[idx + width * 4 * ditheringSize + 2] = Math.min(255, Math.max(0, data[idx + width * 4 * ditheringSize + 2] + errB * 5 / 16));
            }
            if (x + ditheringSize < width && y + ditheringSize < height) {
                data[idx + width * 4 * ditheringSize + 4 * ditheringSize] = Math.min(255, Math.max(0, data[idx + width * 4 * ditheringSize + 4 * ditheringSize] + errR * 1 / 16));
                data[idx + width * 4 * ditheringSize + 4 * ditheringSize + 1] = Math.min(255, Math.max(0, data[idx + width * 4 * ditheringSize + 4 * ditheringSize + 1] + errG * 1 / 16));
                data[idx + width * 4 * ditheringSize + 4 * ditheringSize + 2] = Math.min(255, Math.max(0, data[idx + width * 4 * ditheringSize + 4 * ditheringSize + 2] + errB * 1 / 16));
            }
        }
    }
}

function applyAtkinsonDithering(imageData, palette, ditheringSize) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y += ditheringSize) {
        for (let x = 0; x < width; x += ditheringSize) {
            const idx = (y * width + x) * 4;
            const oldR = data[idx];
            const oldG = data[idx + 1];
            const oldB = data[idx + 2];
            
            const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);
            
            for (let dy = 0; dy < ditheringSize && y + dy < height; dy++) {
                for (let dx = 0; dx < ditheringSize && x + dx < width; dx++) {
                    const currentIdx = ((y + dy) * width + (x + dx)) * 4;
                    data[currentIdx] = newR;
                    data[currentIdx + 1] = newG;
                    data[currentIdx + 2] = newB;
                }
            }

            const errR = (oldR - newR) / 8;
            const errG = (oldG - newG) / 8;
            const errB = (oldB - newB) / 8;

            const neighbors = [
                [1, 0], [2, 0],
                [-1, 1], [0, 1], [1, 1],
                [0, 2]
            ];

            for (const [dx, dy] of neighbors) {
                const nx = x + dx * ditheringSize;
                const ny = y + dy * ditheringSize;
                if (nx >= 0 && nx < width && ny < height) {
                    const nidx = (ny * width + nx) * 4;
                    data[nidx] = Math.min(255, Math.max(0, data[nidx] + errR));
                    data[nidx + 1] = Math.min(255, Math.max(0, data[nidx + 1] + errG));
                    data[nidx + 2] = Math.min(255, Math.max(0, data[nidx + 2] + errB));
                }
            }
        }
    }
}

function findClosestColor(r, g, b, palette) {
    let minDistance = Infinity;
    let closestColor = palette[0];

    for (const color of palette) {
        const [pr, pg, pb] = hexToRgb(color);
        const distance = Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2);
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
        }
    }

    return hexToRgb(closestColor);
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

async function captureImage() {
    // Pause processing
    isProcessing = false;
    
    // Get the capture canvas and its context
    const captureCanvas = document.getElementById('captureCanvas');
    const captureCtx = captureCanvas.getContext('2d');
    
    // Use the same dimensions and cropping as the live preview
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = captureCanvas.width / captureCanvas.height;
    let drawWidth = captureCanvas.width;
    let drawHeight = captureCanvas.height;
    let drawX = 0;
    let drawY = 0;
    
    // Always fill the width and adjust height to maintain aspect ratio
    if (videoAspect > canvasAspect) {
        drawHeight = captureCanvas.width / videoAspect;
        drawY = (captureCanvas.height - drawHeight) / 2;
    } else {
        // If video is taller, fill the height and adjust width
        drawWidth = captureCanvas.height * videoAspect;
        drawX = (captureCanvas.width - drawWidth) / 2;
    }
    
    // Scale up to ensure no empty space
    const scale = Math.max(
        captureCanvas.width / drawWidth,
        captureCanvas.height / drawHeight
    );
    
    drawWidth *= scale;
    drawHeight *= scale;
    drawX = (captureCanvas.width - drawWidth) / 2;
    drawY = (captureCanvas.height - drawHeight) / 2;
    
    // Draw the current frame with effects
    captureCtx.fillStyle = '#000';
    captureCtx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
    captureCtx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
    const imageData = captureCtx.getImageData(0, 0, captureCanvas.width, captureCanvas.height);
    
    // Apply effects
    applyBrightnessContrast(imageData);
    applyDithering(imageData);
    captureCtx.putImageData(imageData, 0, 0);
    
    // Show the capture overlay
    document.getElementById('captureOverlay').classList.remove('hidden');

    // Add temporary buttons for save/discard
    const overlay = document.getElementById('captureOverlay');
    const actionButtons = document.createElement('div');
    actionButtons.className = 'capture-actions';
    actionButtons.innerHTML = `
        <button id="saveCapture">Save</button>
        <button id="discardCapture">Discard</button>
    `;
    overlay.appendChild(actionButtons);

    // Handle save/discard actions
    document.getElementById('saveCapture').onclick = async () => {
        try {
            const blob = await new Promise(resolve => captureCanvas.toBlob(resolve, 'image/png'));
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `dithered_${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error saving image:', err);
            alert('Failed to save image');
        }
        cleanupCapture();
    };

    document.getElementById('discardCapture').onclick = cleanupCapture;
}

function cleanupCapture() {
    // Remove action buttons
    const actionButtons = document.querySelector('.capture-actions');
    if (actionButtons) {
        actionButtons.remove();
    }

    // Hide overlay
    document.getElementById('captureOverlay').classList.add('hidden');

    // Resume processing
    isProcessing = true;
    processFrame();
}

// Add styles for capture actions
const style = document.createElement('style');
style.textContent = `
    .capture-actions {
        position: fixed;
        bottom: 30px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 20px;
        z-index: 2001;
    }

    .capture-actions button {
        padding: 12px 24px;
        border: none;
        background: white;
        color: black;
        font-size: 16px;
        cursor: pointer;
    }
`;
document.head.appendChild(style);

async function playStartupAnimation() {
    return new Promise((resolve) => {
        setTimeout(() => {
            const startupAnimation = document.getElementById('startupAnimation');
            startupAnimation.style.opacity = '0';
            startupAnimation.style.transition = 'opacity 0.5s ease-out';
            
            setTimeout(() => {
                startupAnimation.remove();
                resolve();
            }, 500);
        }, 2200); // Reduced total animation time (1.7s for last text + 0.5s extra)
    });
}

function randomizeSettings() {
    // Get all available options
    const ditheringTypes = ['ordered', 'floyd-steinberg', 'atkinson'];
    const palettes = Object.keys(colorPalettes);
    
    // Select random options
    const randomDither = ditheringTypes[Math.floor(Math.random() * ditheringTypes.length)];
    const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
    
    // Update settings
    settings.ditheringType = randomDither;
    settings.colorPalette = randomPalette;
    
    // Update UI
    document.getElementById('ditheringType').value = randomDither;
    document.getElementById('colorPalette').value = randomPalette;
}
