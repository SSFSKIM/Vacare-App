import { useState } from "react";
import { useMigrateAssessmentData } from "utils/migration-helper";
import { toast } from "sonner";

export const MigrationButton = () => {
  const { migrateData } = useMigrateAssessmentData();
  const [isMigrating, setIsMigrating] = useState(false);
  
  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      await migrateData();
      toast.success("Data migrated successfully");
    } catch (error) {
      console.error("Error migrating data:", error);
      toast.error("Failed to migrate data");
    } finally {
      setIsMigrating(false);
    }
  };
  
  return (
    <button 
      onClick={handleMigration}
      disabled={isMigrating}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isMigrating ? "Migrating..." : "Migrate Assessment Data"}
    </button>
  );
};
