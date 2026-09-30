
"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { generateProfile } from '@/ai/flows/generate-profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProfilePreview } from '@/components/profile-preview';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Edit3, UserCircle2, Link as LinkIcon, Download, Info, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export function ProfilePageClient() {
  const [prompt, setPrompt] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [headline, setHeadline] = useState<string>('');
  const [profileContent, setProfileContent] = useState<string>('');
  const [interests, setInterests] = useState<string>('');
  const [skills, setSkills] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [hostedImageUrl, setHostedImageUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isShorteningLink, setIsShorteningLink] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentPreviewUrl = imagePreviewUrl;
    return () => {
      if (currentPreviewUrl && currentPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleGenerateProfile = async () => {
    if (!prompt.trim()) {
      setErrorMessage("Please enter a prompt for the AI.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await generateProfile({ prompt });
      setName(result.name);
      setHeadline(result.headline);
      setProfileContent(result.content);
      setInterests(result.interests);
      setSkills(result.skills);
      logger.info("AI profile generated", { promptLength: prompt.length, profileLength: result.content.length });
      toast({
        title: "AI Profile Generated!",
        description: "Your AI-generated profile is ready for customization.",
      });
    } catch (error) {
      logger.error("AI profile generation failed", error, { promptLength: prompt.length });
      setErrorMessage("Failed to generate profile. Please try again or refine your prompt.");
      toast({
        variant: "destructive",
        title: "Error Generating Profile",
        description: "An issue occurred while communicating with the AI.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrorMessage("Image size should not exceed 5MB.");
        setImageFile(null);
        setImagePreviewUrl(null);
        setHostedImageUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; 
        }
        return;
      }
      setImageFile(file);
      setErrorMessage(null);

      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      const localPreview = URL.createObjectURL(file);
      setImagePreviewUrl(localPreview);
      
      setIsUploadingImage(true);
      setHostedImageUrl(null);

      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!apiKey) {
        logger.error("ImgBB upload skipped: NEXT_PUBLIC_IMGBB_API_KEY is not set", null, { fileName: file.name });
        toast({
          variant: "destructive",
          title: "Image Upload Configuration Error",
          description: "ImgBB API key is missing. Please add NEXT_PUBLIC_IMGBB_API_KEY to your .env.local file.",
        });
        setIsUploadingImage(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData?.error?.message || `ImgBB API error: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.data && result.data.url) {
          setHostedImageUrl(result.data.url);
          logger.info("ImgBB upload succeeded", { fileName: file.name, hostedUrl: result.data.url });
          toast({
            title: "Image Uploaded!",
            description: "Your image has been successfully hosted and will be included in the PDF link.",
          });
        } else {
          throw new Error("ImgBB API did not return a valid image URL.");
        }
      } catch (error: any) {
        logger.error("ImgBB upload failed", error, { fileName: file.name, fileSize: file.size });
        setErrorMessage(`Failed to upload image: ${error.message}`);
        toast({
          variant: "destructive",
          title: "Image Upload Failed",
          description: error.message || "Could not upload image to ImgBB.",
        });
        setHostedImageUrl(null);
      } finally {
        setIsUploadingImage(false);
      }

    } else {
      setImageFile(null);
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);
      setHostedImageUrl(null);
    }
  };
  
  const handleDownloadPdf = () => {
    toast({
      title: "Preparing Download",
      description: "Your browser's print dialog will open. Choose 'Save as PDF'.",
    });
    window.print();
  };

  const handleCopyPdfLink = async () => {
    setIsShorteningLink(true);
    try {
      const doc: Record<string, string> = {};
      if (name) doc.name = name;
      if (headline) doc.headline = headline;
      if (profileContent) doc.content = profileContent;
      if (interests) doc.interests = interests;
      if (skills) doc.skills = skills;
      if (hostedImageUrl) {
        doc.imageUrl = hostedImageUrl;
      } else if (imagePreviewUrl && (imagePreviewUrl.startsWith('http://') || imagePreviewUrl.startsWith('https://'))) {
        doc.imageUrl = imagePreviewUrl;
      }

      const bytes = new TextEncoder().encode(JSON.stringify(doc));
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const shareUrl = `${window.location.origin}/?doc=${encoded}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Profile Link Copied!",
        description: "A shareable link to your MetaMe profile has been copied.",
      });
    } catch (err: any) {
      logger.error("Failed to copy profile link", err);
      toast({
        variant: "destructive",
        title: "Failed to Copy Link",
        description: "Could not copy the link to your clipboard.",
      });
    } finally {
      setIsShorteningLink(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-xl non-printable-section">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Sparkles className="mr-2 h-7 w-7 text-accent" />
            Spark Your Profile with AI
          </CardTitle>
          <CardDescription>
            Describe your ideal profile, and let our AI craft a starting point for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ai-prompt" className="text-lg font-medium">Your Prompt</Label>
              <Textarea
                id="ai-prompt"
                placeholder="e.g., A creative software engineer passionate about sustainable tech and hiking..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] mt-1 text-base"
                rows={4}
              />
            </div>
            {errorMessage && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerateProfile} disabled={isLoading || isUploadingImage || isShorteningLink} size="lg" className="non-printable-section">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate with AI
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-xl"> 
        <CardHeader className="non-printable-section">
          <CardTitle className="font-headline text-2xl flex items-center">
            <Edit3 className="mr-2 h-7 w-7 text-accent" />
            Craft Your MetaMe
          </CardTitle>
          <CardDescription>
            Personalize your details, refine content, and add your touch.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6 non-printable-section">
            <div>
              <Label htmlFor="profile-image" className="text-lg font-medium block mb-1">Profile Photo</Label>
              <div className="flex items-center gap-4">
                {imagePreviewUrl ? (
                  <Image src={imagePreviewUrl} alt="Profile preview" width={80} height={80} className="rounded-full object-cover border-2 border-primary" data-ai-hint="user avatar"/>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <UserCircle2 className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <Input ref={fileInputRef} id="profile-image" type="file" accept="image/png, image/jpeg, image/gif" onChange={handleImageChange} className="max-w-xs" disabled={isUploadingImage || isShorteningLink} />
                {isUploadingImage && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB. Uploaded to ImgBB for PDF link.</p>
            </div>

            <div>
              <Label htmlFor="name" className="text-lg font-medium">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Alex Johnson" className="mt-1 text-base" />
            </div>

            <div>
              <Label htmlFor="headline" className="text-lg font-medium">Headline / Tagline</Label>
              <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g., Senior Developer | Tech Enthusiast" className="mt-1 text-base" />
            </div>

            <div>
              <Label htmlFor="profile-content" className="text-lg font-medium">Main Profile Content</Label>
              <Textarea
                id="profile-content"
                value={profileContent}
                onChange={(e) => setProfileContent(e.target.value)}
                placeholder="Your detailed profile bio, experience, and aspirations..."
                className="min-h-[150px] mt-1 text-base"
                rows={8}
              />
            </div>

            <div>
              <Label htmlFor="interests" className="text-lg font-medium">Interests</Label>
              <Input id="interests" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g., AI, Photography, Travel (comma-separated)" className="mt-1 text-base" />
            </div>

            <div>
              <Label htmlFor="skills" className="text-lg font-medium">Skills</Label>
              <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g., React, Python, Project Management (comma-separated)" className="mt-1 text-base" />
            </div>
          </div>

          <div className="md:sticky md:top-8 md:self-start printable-profile">
            <ProfilePreview
              name={name}
              headline={headline}
              content={profileContent}
              interests={interests}
              skills={skills}
              imageUrl={imagePreviewUrl} 
            />
          </div>
        </CardContent>
        <CardFooter className="non-printable-section flex flex-wrap gap-2">
            <Button onClick={handleDownloadPdf} variant="outline" size="lg" disabled={isUploadingImage || isShorteningLink}>
                <Download className="mr-2 h-5 w-5" />
                Download as PDF (Print)
            </Button>
            <Button onClick={handleCopyPdfLink} variant="outline" size="lg" disabled={isUploadingImage || isShorteningLink}>
              {isShorteningLink ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-5 w-5" />
                  Copy Profile Link
                </>
              )}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

