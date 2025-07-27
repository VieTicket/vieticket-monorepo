"use client"

import { useState, useEffect } from 'react';

/**
 * A reactive custom hook to get a list of available video input devices (cameras).
 * It listens for permission changes and device changes to keep the list up-to-date.
 * @returns {MediaDeviceInfo[]} An array of available video input devices.
 */
export const useCameraDevices = (): MediaDeviceInfo[] => {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        const getDevices = async (): Promise<void> => {
            try {
                const availableDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = availableDevices.filter(
                    ({ kind }) => kind === 'videoinput'
                );
                setDevices(videoDevices);
            } catch (err) {
                console.error("Error enumerating devices:", err);
                // On error, ensure the device list is empty
                setDevices([]);
            }
        };

        // Get initial list of devices
        getDevices();

        // Listen for changes in devices (e.g., plugging in a new webcam)
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        
        // This variable will hold the permission status object
        let permissionStatus: PermissionStatus | undefined;

        // Query for camera permission status
        navigator.permissions.query({ name: 'camera' as PermissionName })
            .then((status) => {
                permissionStatus = status;
                // This event fires when the user grants or revokes permission
                permissionStatus.onchange = () => {
                    getDevices();
                };
            })
            .catch((err) => {
                console.error("Error querying camera permissions:", err);
            });

        // Cleanup function to remove listeners when the component unmounts
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', getDevices);
            // Ensure permissionStatus is defined before removing the listener
            if (permissionStatus) {
                permissionStatus.onchange = null;
            }
        };
    }, []); // Empty dependency array ensures this setup runs only once

    return devices;
};