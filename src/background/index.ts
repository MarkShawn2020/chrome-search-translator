import { onMessage } from 'webext-bridge';

// Initialize the service worker
const initializeServiceWorker = () => {
    console.log('Service worker initialized');

    // Setup message handlers
    onMessage('hello-from-content-script', (msg) => {
        console.log('Received message from content script:', msg);
    });

    // Handle translation requests if needed
    onMessage('translate-text', async (msg) => {
        console.log('Translation request received:', msg);
        // Translation logic would go here
        return { success: true };
    });

    // Handle toggle translation feature
    onMessage('toggle-translation', (msg) => {
        console.log('Translation toggle:', msg);
        // Toggle logic would go here
        return { success: true };
    });
};

// Listen for install events
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
});

// Initialize when service worker starts
initializeServiceWorker();

console.log('Google Search Translator service worker is running!');
