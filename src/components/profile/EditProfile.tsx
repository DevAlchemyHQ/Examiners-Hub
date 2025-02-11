import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, setUser } = useAuthStore();
    const [fullName, setFullName] = useState(user?.user_metadata.full_name || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata.avatar_url || '');
    const [subscription, setSubscription] = useState('Up Fast');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAvatarFile(e.target.files[0]);
        }
    };

    const uploadAvatar = async () => {
        if (!avatarFile) return null;

        setUploading(true);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user?.id}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { data, error } = await supabase.storage
            .from('avatars') // Replace with your Supabase storage bucket name
            .upload(filePath, avatarFile, { upsert: true });

        setUploading(false);

        if (error) {
            console.error('Error uploading avatar:', error);
            return null;
        }

        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-lg font-bold mb-4">Edit Profile</h2>

                <label className="block text-sm">Full Name</label>
                <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    className="w-full p-2 border rounded mt-1 mb-3" 
                />

                <label className="block text-sm">Avatar</label>
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleAvatarChange} 
                    className="w-full p-2 border rounded mt-1 mb-3" 
                />
                {avatarUrl && <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full mt-2" />}

                <label className="block text-sm">Subscription</label>
                <select 
                    value={subscription} 
                    onChange={(e) => setSubscription(e.target.value)} 
                    className="w-full p-2 border rounded mt-1 mb-3"
                >
                    <option value="Up Fast">Up Fast</option>
                    <option value="Premium">Premium</option>
                    <option value="Basic">Basic</option>
                </select>

                <div className="flex justify-end mt-4">
                    <button onClick={onClose} className="mr-2 px-4 py-2 bg-gray-300 rounded">Cancel</button>
                    <button 
                        onClick={handleUpdateProfile} 
                        disabled={uploading}
                        className={`px-4 py-2 ${uploading ? 'bg-gray-500' : 'bg-blue-600'} text-white rounded`}
                    >
                        {uploading ? 'Uploading...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
