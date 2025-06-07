"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { generateProfile } from '@/ai/flows/generate-profile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProfilePreview } from '@/components/profile-preview';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Edit3, ImageUp, Download, Info, Loader2, UserCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export function ProfilePageClient() {
  const [prompt, setPrompt] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [headline, setHeadline] = useState<string>('');
  const [profileContent, setProfileContent] = useState<string>('');
  const [interests, setInterests] = useState<string>('');
  const [skills, setSkills] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Cleanup Object URL if used. Using Data URL now, so not strictly needed but good practice if switching.
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
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
      setProfileContent(result.profile);
      toast({
        title: "AI Profile Generated!",
        description: "Your AI-generated profile content is ready for customization.",
      });
    } catch (error) {
      console.error("Error generating profile:", error);
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrorMessage("Image size should not exceed 5MB.");
        setImageFile(null);
        setImagePreviewUrl(null);
        event.target.value = ''; // Reset file input
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrorMessage(null);
    } else {
      setImageFile(null);
      setImagePreviewUrl(null);
    }
  };
  
  const handleDownloadPdf = () => {
    // This is a simple browser print functionality.
    // For a true PDF export, a library like jsPDF or a server-side solution would be needed.
    toast({
      title: "Preparing Download",
      description: "Your browser's print dialog will open. Choose 'Save as PDF'.",
    });
    window.print();
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
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
          <Button onClick={handleGenerateProfile} disabled={isLoading} size="lg">
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
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center">
            <Edit3 className="mr-2 h-7 w-7 text-accent" />
            Craft Your MetaMe
          </CardTitle>
          <CardDescription>
            Personalize your details, refine content, and add your touch.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
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
                <Input id="profile-image" type="file" accept="image/png, image/jpeg, image/gif" onChange={handleImageChange} className="max-w-xs" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB.</p>
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

          <div className="md:sticky md:top-8 md:self-start"> {/* Sticky preview on desktop */}
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
        <CardFooter>
            <Button onClick={handleDownloadPdf} variant="outline" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Download as PDF (Print)
            </Button>
        </CardFooter>
      </Card>
      
      {/* Styles for printing the preview only */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-profile, .printable-profile * {
            visibility: visible;
          }
          .printable-profile {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Hide non-essential elements for print */
          header, footer, button, .non-printable {
            display: none !important;
          }
        }
      `}</style>
      <div className="printable-profile md:hidden"> {/* Hidden on screen, shown for print if needed, but ProfilePreview will be styled */}
         {/* This div is mainly a trick for @media print css if we want to isolate content. 
             However, window.print() will print the current view.
             The Card structure around ProfilePreview should be hidden by the @media print styles.
             The current ProfilePreview is within CardContent, so it might not be ideal.
             For a simple print, we just apply print styles to hide everything else.
             The ProfilePreview Card itself will be printed.
         */}
      </div>
    </div>
  );
}
