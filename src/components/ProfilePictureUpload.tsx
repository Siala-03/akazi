'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface ProfilePictureUploadProps {
    currentPicture?: string;
    onUploadSuccess: (imageUrl: string) => void;
    size?: 'sm' | 'md' | 'lg';
}

export default function ProfilePictureUpload({
    currentPicture,
    onUploadSuccess,
    size = 'md',
}: ProfilePictureUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(currentPicture || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sizeClasses = {
        sm: 'w-16 h-16',
        md: 'w-24 h-24',
        lg: 'w-32 h-32',
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('profilePicture', file);

            const res = await fetch('/api/upload/profile-picture', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Upload failed');
            }

            const data = await res.json();
            
            // Update user profile with new picture URL
            const updateRes = await fetch('/api/auth/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profilePicture: data.imageUrl }),
            });

            if (!updateRes.ok) {
                throw new Error('Failed to update profile');
            }

            toast.success('Profile picture updated!');
            onUploadSuccess(data.imageUrl);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error instanceof Error ? error.message : 'Upload failed');
            setPreviewUrl(currentPicture || '');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async () => {
        try {
            const res = await fetch('/api/auth/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profilePicture: '' }),
            });

            if (!res.ok) {
                throw new Error('Failed to remove picture');
            }

            setPreviewUrl('');
            onUploadSuccess('');
            toast.success('Profile picture removed');
        } catch (error) {
            toast.error('Failed to remove picture');
        }
    };

    return (
        <div className="flex flex-col items-center space-y-3">
            <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-4 border-white shadow-lg`}>
                {previewUrl ? (
                    <Image
                        src={previewUrl}
                        alt="Profile"
                        fill
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white opacity-70" />
                    </div>
                )}
                
                {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                )}
            </div>

            <div className="flex space-x-2">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center space-x-2"
                >
                    <Upload className="w-4 h-4" />
                    <span>{previewUrl ? 'Change' : 'Upload'}</span>
                </button>

                {previewUrl && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={uploading}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 flex items-center space-x-2"
                    >
                        <X className="w-4 h-4" />
                        <span>Remove</span>
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            <p className="text-xs text-gray-500 text-center max-w-xs">
                Recommended: Square image, max 5MB
            </p>
        </div>
    );
}
