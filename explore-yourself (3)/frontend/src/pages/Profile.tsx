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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
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

        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Assessment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading assessment results...</p>
              ) : (
                <div className="space-y-6">
                  <AssessmentResultDisplay
                    title="Interest Assessment"
                    results={assessment?.interest.results}
                  />
                  <AssessmentResultDisplay
                    title="Ability Assessment"
                    results={assessment?.ability.results}
                  />
                  <AssessmentResultDisplay
                    title="Knowledge Assessment"
                    results={assessment?.knowledge.results}
                  />
                  <AssessmentResultDisplay
                    title="Skills Assessment"
                    results={assessment?.skills.results}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

const AssessmentResultDisplay = ({ title, results }) => {
  const getTopResults = (results) => {
    if (!results || results.length === 0) return [];
    // Handle different result structures (some might have 'name', others 'subset')
    const sorted = [...results]
      .sort((a, b) => b.score - a.score);
    
    // If results have subsets, group them
    if(sorted[0]?.subset) {
      const subsetResults = sorted.reduce((acc, curr) => {
        if(!acc[curr.subset]) {
          acc[curr.subset] = [];
        }
        acc[curr.subset].push(curr);
        return acc;
      }, {});
      
      return Object.entries(subsetResults).map(([subset, items]) => ({
        name: subset,
        score: items.reduce((sum, item) => sum + item.score, 0) / items.length
      })).slice(0, 3);
    }
    
    return sorted.slice(0, 3);
  };

  const topResults = getTopResults(results);

  return (
    <div className="p-4 rounded-lg bg-gray-50">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      {topResults.length > 0 ? (
        <ul className="space-y-2">
          {topResults.map((result, index) => (
            <li key={index} className="flex justify-between items-center">
              <span>{result.name}</span>
              <span className="font-bold text-lg text-blue-600">{result.score.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No results yet. Complete the assessment to see your summary!</p>
      )}
    </div>
  );
};
