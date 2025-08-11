import React, { useState, useEffect } from "react";
import { useUserGuardContext } from "app";
import { useNavigate } from "react-router-dom";
import { useFirebaseAssessmentStore } from "utils/firebase-assessment-store";
import { saveProfileData, ProfileData } from "utils/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

const gradeLevels = [
  "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade",
  "College Freshman", "College Sophomore", "College Junior", "College Senior",
];

export default function Profile() {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const { assessment, isLoading } = useFirebaseAssessmentStore();
  const [profileData, setProfileData] = useState<ProfileData>({
    dob: "",
    gender: "",
    education: "",
    grade: "",
  });

  useEffect(() => {
    if (assessment?.profile) {
      setProfileData(assessment.profile);
    }
  }, [assessment]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSaveProfile = async () => {
    try {
      await saveProfileData(user.uid, profileData);
      toast.success("Profile saved successfully!");
    } catch (error) {
      toast.error("Failed to save profile.");
      console.error("Error saving profile:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 bg-slate-50 min-h-screen">
      <Button
        variant="outline"
        className="mb-4"
        onClick={() => navigate("/")}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Go Back to Main Page
      </Button>
      <div className="flex items-center mb-8">
         {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full mr-6" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center mr-6 text-4xl">
              {user.email?.[0]?.toUpperCase()}
            </div>
          )}
        <div>
          <h1 className="text-4xl font-bold">{user.displayName || "Your Profile"}</h1>
          <p className="text-lg text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div>
                <label htmlFor="dob" className="block text-sm font-medium mb-2">
                  Date of Birth
                </label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  value={profileData.dob}
                  onChange={handleInputChange}
                  className="w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="gender"
                  className="block text-sm font-medium mb-2"
                >
                  Gender
                </label>
                <Select
                  name="gender"
                  value={profileData.gender}
                  onValueChange={(value) => handleSelectChange("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label
                  htmlFor="education"
                  className="block text-sm font-medium mb-2"
                >
                  Education Level
                </label>
                <Select
                  name="education"
                  value={profileData.education}
                  onValueChange={(value) =>
                    handleSelectChange("education", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elementary">Elementary</SelectItem>
                    <SelectItem value="middle-school">Middle School</SelectItem>
                    <SelectItem value="high-school">High School</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="graduate-school">Graduate School</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label
                  htmlFor="grade"
                  className="block text-sm font-medium mb-2"
                >
                  Academic Grade
                </label>
                 <Select
                  name="grade"
                  value={profileData.grade}
                  onValueChange={(value) => handleSelectChange("grade", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeLevels.map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveProfile} className="w-full text-lg py-6">
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
