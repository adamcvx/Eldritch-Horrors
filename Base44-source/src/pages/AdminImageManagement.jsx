
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Horror } from '@/entities/Horror';
import { Images } from '@/entities/Images';
import { Backgrounds } from '@/entities/Backgrounds';
import { Assets } from '@/entities/Assets'; // New import for Assets
import { UploadFile, GenerateImage } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, UploadCloud, Save, Trash2, ShieldAlert, X, Image, Check } from 'lucide-react';
import { Label } from '@/components/ui/label'; // New import for Label
import { Avatar as AvatarEntity } from '@/entities/Avatar'; // Import the new entity

const AdminImageManagement = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Common data
    const [horrors, setHorrors] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    
    // Horror Image Generation
    const [selectedHorrors, setSelectedHorrors] = useState(new Set());
    const [generatingImages, setGeneratingImages] = useState(false);
    const [completedImages, setCompletedImages] = useState([]);
    
    // Image Upload
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [pendingImages, setPendingImages] = useState([]);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Background Management State
    const [backgrounds, setBackgrounds] = useState([]);
    const [backgroundFiles, setBackgroundFiles] = useState([]);
    const [uploadingBackgrounds, setUploadingBackgrounds] = useState(false);
    const [backgroundUploadError, setBackgroundUploadError] = useState(null);
    const [backgroundUploadProgress, setBackgroundUploadProgress] = useState(0);
    const [pendingBackgrounds, setPendingBackgrounds] = useState([]);
    const [savingBackgrounds, setSavingBackgrounds] = useState(false);
    const [deletingBackgroundId, setDeletingBackgroundId] = useState(null);

    // Assets Management State (New)
    const [assets, setAssets] = useState([]);
    const [assetFiles, setAssetFiles] = useState([]);
    const [uploadingAssets, setUploadingAssets] = useState(false);
    const [assetUploadError, setAssetUploadError] = useState(null);
    const [assetUploadProgress, setAssetUploadProgress] = useState(0);
    const [pendingAssets, setPendingAssets] = useState([]);
    const [savingAssets, setSavingAssets] = useState(false);
    const [deletingAssetId, setDeletingAssetId] = useState(null);

    // Avatar Generation State (New)
    const [generatingAvatars, setGeneratingAvatars] = useState(false);
    const [avatarGenerationProgress, setAvatarGenerationProgress] = useState(0);
    const [generatedAvatars, setGeneratedAvatars] = useState([]);

    const loadData = async () => {
        try {
            const user = await User.me();
            setIsAdmin(user.role === 'admin');
            
            if (user.role === 'admin') {
                const [horrorList, imageList, backgroundList, assetList] = await Promise.all([
                    Horror.list(),
                    Images.list('-created_date'),
                    Backgrounds.list('-created_date'),
                    Assets.list('-created_date') // Fetch assets
                ]);
                setHorrors(horrorList);
                setExistingImages(imageList);
                setBackgrounds(backgroundList);
                setAssets(assetList); // Set assets state
            }
        } catch (error) {
            console.error("Error loading admin data:", error);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Horror Image Generation Functions
    const handleHorrorSelect = (horrorId, checked) => {
        const newSelected = new Set(selectedHorrors);
        if (checked) {
            newSelected.add(horrorId);
        } else {
            newSelected.delete(horrorId);
        }
        setSelectedHorrors(newSelected);
    };

    const selectAllHorrors = () => {
        setSelectedHorrors(new Set(horrors.map(h => h.id)));
    };

    const selectNoHorrors = () => {
        setSelectedHorrors(new Set());
    };

    const generateImages = async () => {
        if (selectedHorrors.size === 0) return;
        
        setGeneratingImages(true);
        setCompletedImages([]);
        
        const horrorPrompts = {
            "Faceless Watcher": "A terrifying faceless eldritch horror from cosmic void spaces, silent observer entity with no features where a face should be, dark cosmic background, Lovecraftian cosmic horror, unsettling presence, H.P. Lovecraft inspired, dark fantasy art Todd McFarlane comicbook style only",
            "Deep Lurker": "Amphibious Lovecraftian sea monster from sunken city, covered in glowing phosphorescent eyes, tentacled aquatic horror, barnacles and seaweed, deep ocean terror, cosmic horror, H.P. Lovecraft Dagon inspired Todd McFarlane comicbook style only",
            "Dream-Eater": "Ethereal nightmare entity that feeds on dreams and sanity, wispy shadow creature with multiple mouths, dream-like distorted form, surreal horror, H.P. Lovecraft dreamlands horror, psychic terror Todd McFarlane comicbook style only",
            "Gibbering Shambler": "Amorphous mass of writhing flesh covered in chattering mouths and eyes, body horror abomination, constantly whispering secrets, grotesque Lovecraftian flesh monster, cosmic horror, disturbing organic shapes Todd McFarlane comicbook style only"
        };

        const selectedHorrorList = horrors.filter(h => selectedHorrors.has(h.id));

        for (const horror of selectedHorrorList) {
            try {
                const prompt = horrorPrompts[horror.name] || `A Lovecraftian horror called ${horror.name}, eldritch abomination, cosmic horror, dark fantasy art, H.P. Lovecraft inspired, terrifying creature Todd McFarlane comicbook style only`;

                const imageResult = await GenerateImage({ prompt });
                
                if (imageResult && imageResult.url) {
                    await Horror.update(horror.id, { image: imageResult.url });
                    setCompletedImages(prev => [...prev, horror.name]);
                }
            } catch (error) {
                console.error(`Error generating image for ${horror.name}:`, error);
            }
        }

        setGeneratingImages(false);
        loadData(); // Reload to show updated images
    };

    // Image Upload Functions
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);
        setUploadError(null);
    };

    const handleBulkUpload = async () => {
        if (files.length === 0) return;
        
        setUploading(true);
        setUploadError(null);
        setUploadProgress(0);
        
        const newPendingImages = [];
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const result = await UploadFile({ file });
                    if (result && result.file_url) {
                        newPendingImages.push({
                            id: `temp_${Date.now()}_${i}`,
                            url: result.file_url,
                            filename: file.name,
                            nameA: '',
                            nameB: ''
                        });
                    }
                } catch (error) {
                    console.error(`Failed to upload ${file.name}:`, error);
                }
                setUploadProgress(Math.round((i + 1) / files.length * 100));
            }
            
            setPendingImages(prev => [...prev, ...newPendingImages]);
            setFiles([]);
            
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) fileInput.value = '';
            
        } catch (error) {
            console.error("Bulk upload failed:", error);
            setUploadError("Some uploads failed. Check console for details.");
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const updatePendingImage = (id, field, value) => {
        setPendingImages(prev => prev.map(img => 
            img.id === id ? { ...img, [field]: value } : img
        ));
    };

    const removePendingImage = (id) => {
        setPendingImages(prev => prev.filter(img => img.id !== id));
    };

    const handleSaveAllPending = async () => {
        const validImages = pendingImages.filter(img => 
            img.nameA && img.nameB && img.nameA !== img.nameB
        );
        
        if (validImages.length === 0) {
            alert("Please assign horror pairs to at least one image.");
            return;
        }

        setSaving(true);
        try {
            const savePromises = validImages.map(img => 
                Images.create({
                    nameA: horrors.find(h => h.id === img.nameA).name,
                    nameB: horrors.find(h => h.id === img.nameB).name,
                    image: img.url
                })
            );
            
            await Promise.all(savePromises);
            setPendingImages(prev => prev.filter(img => !validImages.includes(img)));
            loadData();
            alert(`Successfully saved ${validImages.length} images to the library!`);
        } catch (error) {
            console.error("Failed to save images:", error);
            alert("Failed to save some images. Please check the console for details.");
        } finally {
            setSaving(false);
        }
    };
    
    const handleDeleteImage = async (id) => {
        if (!window.confirm("Are you sure you want to delete this image entry?")) return;
        setDeletingId(id);
        try {
            await Images.delete(id);
            loadData();
        } catch (error) {
            console.error("Failed to delete image entry:", error);
        } finally {
            setDeletingId(null);
        }
    };

    // Background Management Functions
    const handleBackgroundFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setBackgroundFiles(selectedFiles);
        setBackgroundUploadError(null);
    };

    const handleBulkBackgroundUpload = async () => {
        if (backgroundFiles.length === 0) return;
        
        setUploadingBackgrounds(true);
        setBackgroundUploadError(null);
        setBackgroundUploadProgress(0);
        
        const newPendingBackgrounds = [];
        
        try {
            for (let i = 0; i < backgroundFiles.length; i++) {
                const file = backgroundFiles[i];
                try {
                    const result = await UploadFile({ file });
                    if (result && result.file_url) {
                        newPendingBackgrounds.push({
                            id: `temp_bg_${Date.now()}_${i}`,
                            url: result.file_url,
                            filename: file.name,
                            originType: ''
                        });
                    }
                } catch (error) {
                    console.error(`Failed to upload ${file.name}:`, error);
                }
                setBackgroundUploadProgress(Math.round((i + 1) / backgroundFiles.length * 100));
            }
            
            setPendingBackgrounds(prev => [...prev, ...newPendingBackgrounds]);
            setBackgroundFiles([]);
            
            // Reset file input
            const fileInput = document.querySelector('input[type="file"][accept="image/*"]:last-of-type');
            if (fileInput) fileInput.value = '';
            
        } catch (error) {
            console.error("Bulk background upload failed:", error);
            setBackgroundUploadError("Some uploads failed. Check console for details.");
        } finally {
            setUploadingBackgrounds(false);
            setBackgroundUploadProgress(0);
        }
    };

    const updatePendingBackground = (id, field, value) => {
        setPendingBackgrounds(prev => prev.map(bg => 
            bg.id === id ? { ...bg, [field]: value } : bg
        ));
    };

    const removePendingBackground = (id) => {
        setPendingBackgrounds(prev => prev.filter(bg => bg.id !== id));
    };

    const handleSaveAllPendingBackgrounds = async () => {
        const validBackgrounds = pendingBackgrounds.filter(bg => bg.originType);
        
        if (validBackgrounds.length === 0) {
            alert("Please assign origin types to at least one background.");
            return;
        }

        setSavingBackgrounds(true);
        try {
            const savePromises = validBackgrounds.map(bg => 
                Backgrounds.create({
                    originType: bg.originType,
                    image: bg.url
                })
            );
            
            await Promise.all(savePromises);
            setPendingBackgrounds(prev => prev.filter(bg => !validBackgrounds.includes(bg)));
            loadData();
            alert(`Successfully saved ${validBackgrounds.length} backgrounds!`);
        } catch (error) {
            console.error("Failed to save backgrounds:", error);
            alert("Failed to save some backgrounds. Please check the console for details.");
        } finally {
            setSavingBackgrounds(false);
        }
    };

    const handleDeleteBackground = async (id) => {
        if (!window.confirm("Are you sure you want to delete this background?")) return;
        setDeletingBackgroundId(id);
        try {
            await Backgrounds.delete(id);
            loadData();
            alert("Background deleted successfully!");
        } catch (error) {
            console.error("Failed to delete background:", error);
            alert("Failed to delete background. Please check the console for details.");
        } finally {
            setDeletingBackgroundId(null);
        }
    };

    // Assets Management Functions (New)
    const handleAssetFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setAssetFiles(selectedFiles);
        setAssetUploadError(null);
    };

    const handleBulkAssetUpload = async () => {
        if (assetFiles.length === 0) return;
        
        setUploadingAssets(true);
        setAssetUploadError(null);
        setAssetUploadProgress(0);
        
        const newPendingAssets = [];
        
        try {
            for (let i = 0; i < assetFiles.length; i++) {
                const file = assetFiles[i];
                try {
                    const result = await UploadFile({ file });
                    if (result && result.file_url) {
                        newPendingAssets.push({
                            id: `temp_asset_${Date.now()}_${i}`,
                            fileName: file.name,
                            assetUrl: result.file_url,
                            description: '',
                            category: 'ui' // Default category
                        });
                    }
                } catch (error) {
                    console.error(`Failed to upload ${file.name}:`, error);
                }
                setAssetUploadProgress(Math.round((i + 1) / assetFiles.length * 100));
            }
            
            setPendingAssets(prev => [...prev, ...newPendingAssets]);
            setAssetFiles([]);
            
            // Reset file input
            const fileInput = document.querySelector('input[type="file"][accept="*"]:last-of-type');
            if (fileInput) fileInput.value = '';
            
        } catch (error) {
            console.error("Bulk asset upload failed:", error);
            setAssetUploadError("Some uploads failed. Check console for details.");
        } finally {
            setUploadingAssets(false);
            setAssetUploadProgress(0);
        }
    };

    const updatePendingAsset = (id, field, value) => {
        setPendingAssets(prev => prev.map(asset => 
            asset.id === id ? { ...asset, [field]: value } : asset
        ));
    };

    const removePendingAsset = (id) => {
        setPendingAssets(prev => prev.filter(asset => asset.id !== id));
    };

    const handleSaveAllPendingAssets = async () => {
        const validAssets = pendingAssets.filter(asset => asset.fileName && asset.assetUrl);
        
        if (validAssets.length === 0) {
            alert("No valid assets to save.");
            return;
        }

        setSavingAssets(true);
        try {
            const savePromises = validAssets.map(asset => 
                Assets.create({
                    fileName: asset.fileName,
                    assetUrl: asset.assetUrl,
                    description: asset.description,
                    category: asset.category
                })
            );
            
            await Promise.all(savePromises);
            setPendingAssets(prev => prev.filter(asset => !validAssets.includes(asset)));
            loadData();
            alert(`Successfully saved ${validAssets.length} assets!`);
        } catch (error) {
            console.error("Failed to save assets:", error);
            alert("Failed to save some assets. Please check the console for details.");
        } finally {
            setSavingAssets(false);
        }
    };

    const handleDeleteAsset = async (id) => {
        if (!window.confirm("Are you sure you want to delete this asset?")) return;
        setDeletingAssetId(id);
        try {
            await Assets.delete(id);
            loadData();
            alert("Asset deleted successfully!");
        } catch (error) {
            console.error("Failed to delete asset:", error);
            alert("Failed to delete asset. Please check the console for details.");
        } finally {
            setDeletingAssetId(null);
        }
    };

    // Avatar Generation Functions (New)
    const handleGenerateAvatars = async () => {
        setGeneratingAvatars(true);
        setAvatarGenerationProgress(0);
        setGeneratedAvatars([]);
        
        try {
            const urls = [];
            const prompts = [
                "Hooded cultist portrait, shadowed face partially visible, dark robes with eldritch symbols, mysterious aura, H.P. Lovecraft inspired, gothic horror portrait, Todd McFarlane comic book style only",
                "Masked cultist with ornate ceremonial mask, glowing eyes visible through mask, dark ritual attire, cosmic horror atmosphere, Lovecraftian cult member, Todd McFarlane comic book style only",
                "Ancient cultist elder with weathered face, piercing eyes, flowing dark beard, ritualistic scarification, otherworldly wisdom, H.P. Lovecraft inspired portrait, Todd McFarlane comic book style only",
                "Female cultist with pale skin, dark circled eyes, flowing black hair, ceremonial headdress, eldritch tattoos on forehead, gothic horror, Todd McFarlane comic book style only",
                "Cultist with tentacle-like appendages for hair, partially human face, cosmic horror mutation, dark ritual clothing, H.P. Lovecraft Dagon inspired, Todd McFarlane comic book style only",
                "Blind cultist prophet with white eyes, ritual scars across face, ornate dark robes, holding eldritch tome, mystical aura, Lovecraftian seer, Todd McFarlane comic book style only",
                "Young cultist initiate with innocent face but dark eyes, simple dark robes, pendant with strange symbol, beginning corruption, cosmic horror, Todd McFarlane comic book style only",
                "Cultist with multiple eyes covering face, cosmic horror mutation, dark hood, otherworldly appearance, H.P. Lovecraft inspired abomination, Todd McFarlane comic book style only",
                "Skeletal cultist with exposed skull portions, dark robes, glowing purple eyes in sockets, undead servant, eldritch necromancy, Todd McFarlane comic book style only",
                "Cultist high priest with elaborate headdress, golden eldritch symbols, commanding presence, dark ceremonial armor, cosmic horror leadership, Todd McFarlane comic book style only",
                "Shadow-wreathed cultist, face partially dissolved into darkness, ethereal appearance, void touched follower, H.P. Lovecraft shadow realm, Todd McFarlane comic book style only",
                "Cultist with crystalline growths on face, cosmic horror infection, dark robes with gem inserts, otherworldly transformation, eldritch mineral corruption, Todd McFarlane comic book style only",
                "Ancient cultist mummy with bandaged face, glowing runes on wrappings, preserved by eldritch rituals, undead devotee, Lovecraftian preservation, Todd McFarlane comic book style only",
                "Cultist with fish-like features, scaled skin, gills on neck, Deep One hybrid, dark aquatic robes, H.P. Lovecraft Dagon cult, Todd McFarlane comic book style only",
                "Insectoid cultist with compound eyes, chitinous face plates, dark ritual garb, cosmic horror mutation, eldritch insect transformation, Todd McFarlane comic book style only",
                "Cultist oracle with third eye on forehead, all-seeing gaze, flowing mystical robes, cosmic wisdom corruption, H.P. Lovecraft prescient horror, Todd McFarlane comic book style only",
                "Plague cultist with diseased skin, ritual pustules, dark medical robes, cosmic horror contagion, eldritch disease bearer, Todd McFarlane comic book style only",
                "Cultist with molten lava veins visible under skin, fire-touched devotee, heat-resistant robes, volcanic cult member, eldritch flame corruption, Todd McFarlane comic book style only",
                "Ice-touched cultist with frost covering face, blue-tinted skin, frozen breath, arctic cult robes, cosmic winter horror, Todd McFarlane comic book style only",
                "Cultist with plant growths emerging from skin, nature horror corruption, bark-like patches, eldritch botanical mutation, dark druid robes, Todd McFarlane comic book style only",
                "Mechanical cultist with clockwork face parts, steampunk eldritch fusion, brass gears visible, cosmic horror technology, dark inventor robes, Todd McFarlane comic book style only",
                "Cultist with void-black skin, star-like points of light across face, cosmic horror touched by space, nebula robes, H.P. Lovecraft cosmic void, Todd McFarlane comic book style only",
                "Mirror-faced cultist with reflective surface for face, reality distortion effect, dark robes, eldritch mirror magic, dimensional horror servant, Todd McFarlane comic book style only",
                "Cultist with smoke constantly emanating from eyes and mouth, ethereal presence, dark ritual attire, spirit-touched devotee, ghostly corruption, Todd McFarlane comic book style only",
                "Blood cultist with ritual scarification, crimson stained robes, sacrificial implements, dark devotion, H.P. Lovecraft blood magic practitioner, Todd McFarlane comic book style only",
                "Bone cultist with skull accessories, ivory ritual armor, death magic practitioner, necromantic devotee, eldritch bone crafting, Todd McFarlane comic book style only",
                "Storm cultist with lightning scars, electrically charged hair, tempest robes, weather magic corruption, cosmic storm devotee, Todd McFarlane comic book style only",
                "Dream cultist with constantly shifting facial features, ethereal appearance, sleep realm touched, nightmare robes, H.P. Lovecraft dreamlands horror, Todd McFarlane comic book style only",
                "Serpentine cultist with snake-like eyes, scaled patches on skin, ophidian cult member, dark scaled robes, reptilian eldritch corruption, Todd McFarlane comic book style only",
                "Avian cultist with feathered hair, bird-like features, dark wing-like robes, sky cult devotee, eldritch aerial transformation, Todd McFarlane comic book style only",
                "Stone cultist with rocky skin texture, earth-touched devotee, mineral robes, geological horror corruption, eldritch stone transformation, Todd McFarlane comic book style only",
                "Liquid cultist with partially fluid face, shape-shifting abilities, dark flowing robes, aqueous eldritch corruption, H.P. Lovecraft liquid horror, Todd McFarlane comic book style only",
                "Time-touched cultist with aging and youth flickering across face, temporal distortion, chronos robes, eldritch time magic corruption, Todd McFarlane comic book style only",
                "Gravity cultist with hair and robes defying physics, reality bending around them, cosmic force manipulation, dimensional horror devotee, Todd McFarlane comic book style only",
                "Sound cultist with visible sonic waves around head, hearing enhanced beyond human, acoustic robes, vibration magic practitioner, Todd McFarlane comic book style only",
                "Light cultist with radiant aura, too-bright eyes, solar robes, cosmic illumination corruption, eldritch light bearer, Todd McFarlane comic book style only",
                "Dark matter cultist with reality bending around them, invisible force manipulation, void-touched appearance, cosmic dark energy devotee, Todd McFarlane comic book style only",
                "Probability cultist with multiple potential faces overlapping, quantum horror corruption, precise pattern robes, eldritch chance manipulation, Todd McFarlane comic book style only", // Fixed 'reality uncertainty robes' to 'precise pattern robes' for consistency with order cultist
                "Memory cultist with ghostly faces of others flickering behind them, psychic horror corruption, mind theft robes, eldritch memory absorption, Todd McFarlane comic book style only",
                "Emotion cultist with face showing multiple feelings simultaneously, empathic horror corruption, mood-shifting robes, psychological eldritch manipulation, Todd McFarlane comic book style only",
                "Dimension cultist with portal-like wounds on face showing other realities, planar horror corruption, multidimensional robes, cosmic travel devotee, Todd McFarlane comic book style only",
                "Energy cultist with pure power crackling across skin, elemental horror corruption, force-channeling robes, cosmic energy manipulation, Todd McFarlane comic book style only",
                "Void priest with complete darkness where face should be, cosmic horror leadership, reality negation robes, H.P. Lovecraft void worship, Todd McFarlane comic book style only",
                "Chaos cultist with constantly changing features, disorder magic corruption, ever-shifting robes, eldritch randomness devotee, Todd McFarlane comic book style only",
                "Order cultist with perfectly geometric face, mathematical horror corruption, precise pattern robes, cosmic structure worship, Todd McFarlane comic book style only",
                "Flesh cultist with exposed muscle and sinew, body horror corruption, anatomical robes, H.P. Lovecraft flesh magic practitioner, Todd McFarlane comic book style only",
                "Mind cultist with brain tissue visible through translucent skull, psychic horror corruption, telepathic robes, eldritch mental enhancement, Todd McFarlane comic book style only",
                "Soul cultist with spiritual energy visibly leaking from body, essence magic corruption, ethereal robes, cosmic soul manipulation, Todd McFarlane comic book style only",
                "Reality cultist with existence itself warping around them, fundamental horror corruption, truth-bending robes, eldritch reality manipulation, Todd McFarlane comic book style only",
                "Nightmare cultist with fear made manifest around them, terror magic corruption, horror-inducing robes, H.P. Lovecraft fear incarnate, Todd McFarlane comic book style only"
            ];
            
            for (let i = 0; i < prompts.length; i++) {
                try {
                    const result = await GenerateImage({ prompt: prompts[i] });
                    if (result && result.url) {
                        urls.push(result.url);
                    }
                    setAvatarGenerationProgress(Math.round((i + 1) / prompts.length * 100));
                    // Small delay to prevent overwhelming the API
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (error) {
                    console.error(`Failed to generate avatar ${i + 1}:`, error);
                }
            }
            
            setGeneratedAvatars(urls);

            if (urls.length > 0) {
                // Save the generated URLs to the Avatar entity
                const savePromises = urls.map(url => AvatarEntity.create({ url: url, category: 'Cultist' }));
                await Promise.all(savePromises);
                alert(`Successfully generated and saved ${urls.length} cultist avatars to the database!`);
            } else {
                alert(`Generated ${urls.length} cultist avatars.`);
            }
            
        } catch (error) {
            console.error('Avatar generation failed:', error);
            alert('Avatar generation failed. Check console for details.');
        } finally {
            setGeneratingAvatars(false);
            setAvatarGenerationProgress(0);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("Copied to clipboard!");
        } catch (error) {
            console.error("Failed to copy to clipboard:", error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert("Copied to clipboard!");
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-12 h-12 animate-spin text-purple-500" /></div>;
    }
    
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">This page is for administrators only.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-7xl space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold">Image Management</h1>
                <p className="text-gray-400 mt-2">Manage fusion images, horror portraits, battle backgrounds, UI assets, and cultist avatars.</p>
            </div>

            <Tabs defaultValue="images" className="w-full">
                <TabsList className="grid w-full grid-cols-5"> {/* Changed to grid-cols-5 */}
                    <TabsTrigger value="images">Fusion Images</TabsTrigger>
                    <TabsTrigger value="horror-gen">Horror Portraits</TabsTrigger>
                    <TabsTrigger value="backgrounds">Battle Backgrounds</TabsTrigger>
                    <TabsTrigger value="assets">UI Assets</TabsTrigger>
                    <TabsTrigger value="avatars">Cultist Avatars</TabsTrigger> {/* New tab trigger */}
                </TabsList>

                {/* Image Management Tab */}
                <TabsContent value="images" className="space-y-6">
                    {/* Bulk Upload Section */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle>Step 1: Upload Images (Bulk Upload)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input 
                                type="file" 
                                multiple 
                                accept="image/*"
                                onChange={handleFileChange} 
                                className="max-w-md" 
                            />
                            {files.length > 0 && (
                                <div className="text-sm text-gray-400">
                                    Selected: {files.length} file{files.length !== 1 ? 's' : ''}
                                </div>
                            )}
                            <Button onClick={handleBulkUpload} disabled={files.length === 0 || uploading}>
                                {uploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading... {uploadProgress}%
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                        Upload {files.length} Image{files.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                            {uploadError && <p className="text-destructive text-sm">{uploadError}</p>}
                        </CardContent>
                    </Card>

                    {/* Pending Images Assignment */}
                    {pendingImages.length > 0 && (
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Step 2: Assign Horror Pairs ({pendingImages.length} pending)</span>
                                    <Button 
                                        onClick={handleSaveAllPending} 
                                        disabled={saving}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving All...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save All Valid
                                            </>
                                        )}
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {pendingImages.map((img) => (
                                        <div key={img.id} className="border border-gray-600 rounded-lg p-4 space-y-4">
                                            <div className="relative">
                                                <img 
                                                    src={img.url} 
                                                    alt={img.filename} 
                                                    className="w-full h-32 object-cover rounded-md" 
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 w-6 h-6"
                                                    onClick={() => removePendingImage(img.id)}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-xs text-gray-400 truncate">{img.filename}</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <Select value={img.nameA} onValueChange={(value) => updatePendingImage(img.id, 'nameA', value)}>
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Horror A" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {horrors.map(h => (
                                                                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Select value={img.nameB} onValueChange={(value) => updatePendingImage(img.id, 'nameB', value)}>
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Horror B" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {horrors.map(h => (
                                                                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {img.nameA && img.nameB && img.nameA === img.nameB && (
                                                    <p className="text-red-400 text-xs">Horrors must be different!</p>
                                                )}
                                                {img.nameA && img.nameB && img.nameA !== img.nameB && (
                                                    <p className="text-green-400 text-xs">✓ Ready to save</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Existing Images Library */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle>Image Library ({existingImages.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {existingImages.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-4">No images in the library yet.</p>
                                ) : (
                                    existingImages.map(img => (
                                        <div key={img.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <img src={img.image} alt={`${img.nameA} + ${img.nameB}`} className="w-16 h-16 rounded-md object-cover" />
                                                <div>
                                                    <p className="font-semibold">{img.nameA}</p>
                                                    <p className="text-sm text-muted-foreground">+</p>
                                                    <p className="font-semibold">{img.nameB}</p>
                                                </div>
                                            </div>
                                            <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(img.id)} disabled={deletingId === img.id}>
                                                {deletingId === img.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Horror Image Generation Tab */}
                <TabsContent value="horror-gen" className="space-y-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle>Generate Horror Images</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4 items-center">
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={selectAllHorrors}
                                        variant="outline"
                                        size="sm"
                                        className="border-gray-600"
                                    >
                                        Select All
                                    </Button>
                                    <Button 
                                        onClick={selectNoHorrors}
                                        variant="outline"
                                        size="sm"
                                        className="border-gray-600"
                                    >
                                        Select None
                                    </Button>
                                </div>
                                
                                <Button 
                                    onClick={generateImages}
                                    disabled={generatingImages || selectedHorrors.size === 0}
                                    className="bg-purple-600 hover:bg-purple-700"
                                    size="lg"
                                >
                                    {generatingImages ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Generating {selectedHorrors.size} Images...
                                        </>
                                    ) : (
                                        <>
                                            <Image className="w-5 h-5 mr-2" />
                                            Generate Selected ({selectedHorrors.size})
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {horrors.map(horror => (
                                    <Card 
                                        key={horror.id} 
                                        className={`transition-all cursor-pointer ${
                                            selectedHorrors.has(horror.id) 
                                                ? 'bg-purple-500/20 border-purple-500' 
                                                : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                        }`}
                                        onClick={() => handleHorrorSelect(horror.id, !selectedHorrors.has(horror.id))}
                                    >
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={selectedHorrors.has(horror.id)}
                                                        onCheckedChange={(checked) => handleHorrorSelect(horror.id, checked)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    {horror.name}
                                                </div>
                                                {completedImages.includes(horror.name) && (
                                                    <Check className="w-5 h-5 text-green-400" />
                                                )}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="aspect-square mb-4 bg-gray-700 rounded-lg overflow-hidden">
                                                {horror.image ? (
                                                    <img 
                                                        src={horror.image} 
                                                        alt={horror.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                        <Image className="w-12 h-12" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-sm text-purple-400 font-semibold">{horror.origin}</p>
                                                <p className="text-xs text-gray-400">{horror.description}</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                                                    <span>HP: {horror.baseStats.hp}</span>
                                                    <span>ATK: {horror.baseStats.attack}</span>
                                                    <span>DEF: {horror.baseStats.defense}</span>
                                                    <span>SPD: {horror.baseStats.speed}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Backgrounds Management Tab */}
                <TabsContent value="backgrounds" className="space-y-6">
                    {/* Bulk Upload Section */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle>Step 1: Upload Background Images (Bulk Upload)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input 
                                type="file" 
                                multiple 
                                accept="image/*"
                                onChange={handleBackgroundFileChange} 
                                className="max-w-md" 
                            />
                            {backgroundFiles.length > 0 && (
                                <div className="text-sm text-gray-400">
                                    Selected: {backgroundFiles.length} background image{backgroundFiles.length !== 1 ? 's' : ''}
                                </div>
                            )}
                            <Button onClick={handleBulkBackgroundUpload} disabled={backgroundFiles.length === 0 || uploadingBackgrounds}>
                                {uploadingBackgrounds ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading... {backgroundUploadProgress}%
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                        Upload {backgroundFiles.length} Background{backgroundFiles.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                            {backgroundUploadError && <p className="text-destructive text-sm">{backgroundUploadError}</p>}
                        </CardContent>
                    </Card>

                    {/* Pending Backgrounds Assignment */}
                    {pendingBackgrounds.length > 0 && (
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Step 2: Assign Origin Types ({pendingBackgrounds.length} pending)</span>
                                    <Button 
                                        onClick={handleSaveAllPendingBackgrounds} 
                                        disabled={savingBackgrounds}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {savingBackgrounds ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving All...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save All Valid
                                            </>
                                        )}
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {pendingBackgrounds.map((bg) => (
                                        <div key={bg.id} className="border border-gray-600 rounded-lg p-4 space-y-4">
                                            <div className="relative">
                                                <img 
                                                    src={bg.url} 
                                                    alt={bg.filename} 
                                                    className="w-full h-32 object-cover rounded-md" 
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 w-6 h-6"
                                                    onClick={() => removePendingBackground(bg.id)}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                <p className="text-xs text-gray-400 truncate">{bg.filename}</p>
                                                <Select value={bg.originType} onValueChange={(value) => updatePendingBackground(bg.id, 'originType', value)}>
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Select Origin Type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Void">Void</SelectItem>
                                                        <SelectItem value="Dream">Dream</SelectItem>
                                                        <SelectItem value="Flesh">Flesh</SelectItem>
                                                        <SelectItem value="Sunken">Sunken</SelectItem>
                                                        <SelectItem value="Dimension">Dimension</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {bg.originType && (
                                                    <p className="text-green-400 text-xs">✓ Ready to save</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Existing Backgrounds Library */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle>Background Library ({backgrounds.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {backgrounds.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No backgrounds configured yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {backgrounds.map(bg => (
                                        <div key={bg.id} className="border border-gray-600 rounded-lg overflow-hidden">
                                            <div className="relative h-32">
                                                <img 
                                                    src={bg.image} 
                                                    alt={`${bg.originType} background`} 
                                                    className="w-full h-full object-cover"
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 w-6 h-6"
                                                    onClick={() => handleDeleteBackground(bg.id)}
                                                    disabled={deletingBackgroundId === bg.id}
                                                >
                                                    {deletingBackgroundId === bg.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3 h-3" />
                                                    )}
                                                </Button>
                                            </div>
                                            <div className="p-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-sm">{bg.originType}</span>
                                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        bg.originType === 'Void' ? 'bg-purple-500/20 text-purple-300' :
                                                        bg.originType === 'Dream' ? 'bg-blue-500/20 text-blue-300' :
                                                        bg.originType === 'Flesh' ? 'bg-red-500/20 text-red-300' :
                                                        bg.originType === 'Sunken' ? 'bg-green-500/20 text-green-300' :
                                                        'bg-yellow-500/20 text-yellow-300'
                                                    }`}>
                                                        {bg.originType}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-300 mb-2">Background Info</h4>
                        <p className="text-sm text-gray-400">
                            Battle backgrounds are randomly selected based on the origin types of the fighting creatures. 
                            Having multiple backgrounds per origin type creates variety in your battles. 
                            Use high-quality landscape images for best results.
                        </p>
                    </div>
                </TabsContent>

                {/* Assets Management Tab (New) */}
                <TabsContent value="assets" className="space-y-6">
                    {/* Bulk Upload Section */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle>Step 1: Upload Assets (Bulk Upload)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input 
                                type="file" 
                                multiple 
                                accept="*" // Accept all file types
                                onChange={handleAssetFileChange} 
                                className="max-w-md" 
                            />
                            {assetFiles.length > 0 && (
                                <div className="text-sm text-gray-400">
                                    Selected: {assetFiles.length} file{assetFiles.length !== 1 ? 's' : ''}
                                </div>
                            )}
                            <Button onClick={handleBulkAssetUpload} disabled={assetFiles.length === 0 || uploadingAssets}>
                                {uploadingAssets ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading... {assetUploadProgress}%
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                        Upload {assetFiles.length} Asset{assetFiles.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                            {assetUploadError && <p className="text-destructive text-sm">{assetUploadError}</p>}
                        </CardContent>
                    </Card>

                    {/* Pending Assets Configuration */}
                    {pendingAssets.length > 0 && (
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Step 2: Configure Assets ({pendingAssets.length} pending)</span>
                                    <Button 
                                        onClick={handleSaveAllPendingAssets} 
                                        disabled={savingAssets}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {savingAssets ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving All...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save All Assets
                                            </>
                                        )}
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {pendingAssets.map((asset) => (
                                        <div key={asset.id} className="border border-gray-600 rounded-lg p-4 space-y-4">
                                            <div className="relative">
                                                <div className="w-full h-32 bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
                                                    {asset.assetUrl.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? (
                                                        <img 
                                                            src={asset.assetUrl} 
                                                            alt={asset.fileName} 
                                                            className="max-w-full max-h-full object-contain" 
                                                        />
                                                    ) : (
                                                        <div className="text-center text-gray-400">
                                                            <Image className="w-8 h-8 mx-auto mb-2" />
                                                            <p className="text-xs">{asset.fileName.split('.').pop()?.toUpperCase()}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 w-6 h-6"
                                                    onClick={() => removePendingAsset(asset.id)}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-400 font-semibold mb-1">File Name:</p>
                                                    <p className="text-xs text-white truncate">{asset.fileName}</p>
                                                </div>
                                                
                                                <div>
                                                    <Label className="text-xs text-gray-400">Category</Label>
                                                    <Select 
                                                        value={asset.category} 
                                                        onValueChange={(value) => updatePendingAsset(asset.id, 'category', value)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Select Category" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ui">UI Elements</SelectItem>
                                                            <SelectItem value="icons">Icons</SelectItem>
                                                            <SelectItem value="backgrounds">Backgrounds</SelectItem>
                                                            <SelectItem value="decorations">Decorations</SelectItem>
                                                            <SelectItem value="other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                
                                                <div>
                                                    <Label className="text-xs text-gray-400">Description (Optional)</Label>
                                                    <Input
                                                        placeholder="What is this used for?"
                                                        value={asset.description}
                                                        onChange={(e) => updatePendingAsset(asset.id, 'description', e.target.value)}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>

                                                <p className="text-green-400 text-xs">✓ Ready to save</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Existing Assets Library */}
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle>Assets Library ({assets.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {assets.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No assets uploaded yet.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {assets.map(asset => (
                                        <div key={asset.id} className="border border-gray-600 rounded-lg overflow-hidden">
                                            <div className="relative h-32 bg-gray-700 flex items-center justify-center">
                                                {asset.assetUrl.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? (
                                                    <img 
                                                        src={asset.assetUrl} 
                                                        alt={asset.fileName} 
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                ) : (
                                                    <div className="text-center text-gray-400">
                                                        <Image className="w-8 h-8 mx-auto mb-2" />
                                                        <p className="text-xs">{asset.fileName.split('.').pop()?.toUpperCase()}</p>
                                                    </div>
                                                )}
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-2 right-2 w-6 h-6"
                                                    onClick={() => handleDeleteAsset(asset.id)}
                                                    disabled={deletingAssetId === asset.id}
                                                >
                                                    {deletingAssetId === asset.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3 h-3" />
                                                    )}
                                                </Button>
                                            </div>
                                            <div className="p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-sm truncate">{asset.fileName}</span>
                                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        asset.category === 'ui' ? 'bg-blue-500/20 text-blue-300' :
                                                        asset.category === 'icons' ? 'bg-purple-500/20 text-purple-300' :
                                                        asset.category === 'backgrounds' ? 'bg-green-500/20 text-green-300' :
                                                        asset.category === 'decorations' ? 'bg-pink-500/20 text-pink-300' :
                                                        'bg-gray-500/20 text-gray-300'
                                                    }`}>
                                                        {asset.category}
                                                    </div>
                                                </div>
                                                
                                                {asset.description && (
                                                    <p className="text-xs text-gray-400">{asset.description}</p>
                                                )}
                                                
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 text-xs"
                                                        onClick={() => copyToClipboard(asset.assetUrl)}
                                                    >
                                                        Copy URL
                                                    </Button>
                                                </div>
                                                
                                                <div className="text-xs text-gray-500 font-mono break-all bg-gray-800/50 p-1 rounded">
                                                    {asset.assetUrl.split('/').pop()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-300 mb-2">Assets Info</h4>
                        <p className="text-sm text-gray-400">
                            Upload any UI elements, icons, or other assets needed for the app. 
                            The URL can be copied and used directly in your code. 
                            Organize assets by category for easier management.
                        </p>
                    </div>
                </TabsContent>

                {/* Cultist Avatar Generation Tab (New) */}
                <TabsContent value="avatars" className="space-y-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                        <CardHeader>
                            <CardTitle>Generate Cultist Avatars</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4 items-center">
                                <Button 
                                    onClick={handleGenerateAvatars}
                                    disabled={generatingAvatars}
                                    className="bg-purple-600 hover:bg-purple-700"
                                    size="lg"
                                >
                                    {generatingAvatars ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Generating... {avatarGenerationProgress}%
                                        </>
                                    ) : (
                                        <>
                                            <Image className="w-5 h-5 mr-2" />
                                            Generate 50 Cultist Avatars
                                        </>
                                    )}
                                </Button>
                            </div>
                            
                            {generatingAvatars && (
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${avatarGenerationProgress}%` }}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {generatedAvatars.length > 0 && (
                        <Card className="bg-gray-800/50 border-gray-700">
                            <CardHeader>
                                <CardTitle>Generated Avatars ({generatedAvatars.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-8 gap-3">
                                    {generatedAvatars.map((url, index) => (
                                        <div key={index} className="aspect-square">
                                            <img 
                                                src={url} 
                                                alt={`Avatar ${index + 1}`}
                                                className="w-full h-full object-cover rounded-full border-2 border-purple-500/50"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                                    <h4 className="font-semibold text-green-300 mb-2">Success!</h4>
                                    <p className="text-sm text-gray-300">
                                        The generated avatars have been saved to the database. They will now automatically appear in the user profile selection gallery for all players.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-300 mb-2">Avatar Generation Info</h4>
                        <p className="text-sm text-gray-400">
                            This will generate 50 unique cultist avatars using specific AI prompts. 
                            The process takes approximately 2-3 minutes to complete. Generated avatars are automatically saved and made available to all users.
                        </p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminImageManagement;
