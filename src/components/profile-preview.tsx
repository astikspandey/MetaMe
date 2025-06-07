"use client";

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle2, Briefcase, Zap, Lightbulb } from 'lucide-react';

interface ProfilePreviewProps {
  name: string;
  headline: string;
  content: string;
  interests: string;
  skills: string;
  imageUrl?: string | null;
}

export function ProfilePreview({ name, headline, content, interests, skills, imageUrl }: ProfilePreviewProps) {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <UserCircle2 className="mr-2 h-6 w-6 text-primary" />
          Profile Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center text-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name || 'Profile Picture'}
              width={128}
              height={128}
              className="rounded-full object-cover mb-4 border-4 border-primary shadow-md"
              data-ai-hint="user avatar"
            />
          ) : (
             <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4 border-4 border-primary shadow-md">
               <UserCircle2 className="w-20 h-20 text-muted-foreground" />
             </div>
          )}
          {name && <h2 className="text-2xl font-headline font-semibold text-primary">{name}</h2>}
          {headline && <p className="text-md text-muted-foreground italic">{headline}</p>}
        </div>

        {content && (
          <div>
            <h3 className="text-lg font-headline font-medium mb-2 text-primary">About Me</h3>
            <p className="text-sm whitespace-pre-line">{content}</p>
          </div>
        )}

        {interests && (
          <div>
            <h3 className="text-lg font-headline font-medium mb-2 flex items-center text-primary">
              <Lightbulb className="mr-2 h-5 w-5" /> Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {interests.split(',').map((interest, index) => (
                <span key={index} className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full shadow">
                  {interest.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {skills && (
          <div>
            <h3 className="text-lg font-headline font-medium mb-2 flex items-center text-primary">
              <Zap className="mr-2 h-5 w-5" /> Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.split(',').map((skill, index) => (
                <span key={index} className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full shadow">
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
