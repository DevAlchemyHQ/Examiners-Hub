# Clean Images App

A streamlined React application for structural inspection image and defect management.

## Features

- **Image Upload & Management**: Upload and organize inspection images
- **Defect Entry**: Add defect descriptions and photo numbers
- **Bulk Operations**: Bulk defect entry with text parsing
- **Download Packages**: Generate ZIP files with metadata
- **Responsive Design**: Works on desktop and mobile
- **Dark Mode**: Built-in dark/light theme support

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth + Storage + Database)
- **File Handling**: JSZip for package generation
- **UI Components**: Lucide React icons

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd clean-images-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` with your Supabase credentials:

   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Supabase Setup

### Database Tables

Create these tables in your Supabase database:

#### `user_data` table

```sql
CREATE TABLE user_data (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  images JSONB DEFAULT '[]',
  selected_images TEXT[] DEFAULT '{}',
  bulk_selected_images TEXT[] DEFAULT '{}',
  form_data JSONB DEFAULT '{}',
  defect_sort_direction TEXT,
  sketch_sort_direction TEXT,
  view_mode TEXT DEFAULT 'images',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX user_data_user_id_idx ON user_data(user_id);
```

#### `user_bulk_data` table

```sql
CREATE TABLE user_bulk_data (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bulk_defects JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX user_bulk_data_user_id_idx ON user_bulk_data(user_id);
```

### Storage Bucket

Create a storage bucket named `user-project-files` with the following RLS policy:

```sql
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
```

## Project Structure

```
src/
├── components/          # React components
│   ├── layout/         # Layout components
│   ├── ImageGrid.tsx   # Image grid display
│   ├── ImageUpload.tsx # File upload
│   └── ...
├── store/              # Zustand stores
│   ├── metadataStore.ts
│   ├── authStore.ts
│   └── layoutStore.ts
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── lib/                # External library configs
└── types/              # TypeScript type definitions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Migration to AWS Amplify

This app is designed to be easily migrated to AWS Amplify:

1. Replace Supabase auth with AWS Cognito
2. Replace Supabase storage with AWS S3
3. Replace Supabase database with AWS DynamoDB
4. Update environment variables and API calls

## License

MIT
