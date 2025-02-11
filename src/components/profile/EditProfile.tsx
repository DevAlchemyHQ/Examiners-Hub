import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { X, Upload, UserCircle } from 'lucide-react';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, setUser } = useAuthStore();
    const [fullName, setFullName] = useState(user?.user_metadata.full_name || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata.avatar_url || '');
    const [subscription, setSubscription] = useState(user?.user_metadata.subscription_plan || 'Up Fast');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setAvatarUrl(URL.createObjectURL(file)); // Show preview instantly
        }
    };

    const uploadAvatar = async (): Promise<string | null> => {
        if (!avatarFile) return null;

        setUploading(true);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user?.id}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload to Supabase storage (overwrite existing)
        const { error } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });

        if (error) {
            console.error('Error uploading avatar:', error);
            setUploading(false);
            return null;
        }

        // Get the public URL of the uploaded avatar
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

        setUploading(false);
        return data.publicUrl;
    };

    const handleUpdateProfile = async () => {
        let finalAvatarUrl = avatarUrl;

        if (avatarFile) {
            const uploadedUrl = await uploadAvatar();
            if (uploadedUrl) finalAvatarUrl = uploadedUrl;
        }

        const { data, error } = await supabase.auth.updateUser({
            data: { full_name: fullName, avatar_url: finalAvatarUrl, subscription_plan: subscription },
        });

        if (error) {
            console.error('Error updating profile:', error);
            return;
        }

        if (data?.user) {
            setUser({
                ...data.user,
                user_metadata: {
                    ...data.user.user_metadata,
                    full_name: fullName,
                    avatar_url: finalAvatarUrl,
                    subscription_plan: subscription,
                },
            });
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl max-w-md w-full relative">
                {/* Close button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-6">Edit Profile</h2>

                {/* Avatar Upload Section */}
                <div className="flex flex-col items-center mb-6">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                    ) : (
                        <UserCircle className="w-24 h-24 text-gray-400 dark:text-gray-600" />
                    )}
                    <label className="mt-3 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                        <Upload className="w-5 h-5 mr-2" />
                        {uploading ? "Uploading..." : "Upload Avatar"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                </div>

                {/* Full Name Input */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-700 dark:text-gray-300">Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full p-3 border rounded-lg mt-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Subscription Dropdown */}
                <div className="mb-6">
                    <label className="block text-sm text-gray-700 dark:text-gray-300">Subscription</label>
                    <select
                        value={subscription}
                        onChange={(e) => setSubscription(e.target.value)}
                        className="w-full p-3 border rounded-lg mt-1 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="Up Fast">Up Fast</option>
                        <option value="Premium">Premium</option>
                        <option value="Basic">Basic</option>
                    </select>
                </div>

                {/* Buttons */}
                <div className="flex justify-end">
                    <button onClick={onClose} className="mr-2 px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white">
                        Cancel
                    </button>
                    <button
                        onClick={handleUpdateProfile}
                        disabled={uploading}
                        className={`px-4 py-2 text-white rounded-lg ${uploading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {uploading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
