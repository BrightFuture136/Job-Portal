import { Navigation } from "@/components/navigation";
import { useQuery } from "@tanstack/react-query";
import { Job } from "@shared/schema";
import { JobCard } from "@/components/job-card";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Search, Bookmark, X, Loader2, Filter } from "lucide-react";
import {
  AdvancedFilters,
  type FilterValues,
} from "@/components/advanced-filters";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

const defaultFilters: FilterValues = {
  keyword: "",
  location: "",
  type: null,
  experienceLevel: null,
  salaryMin: 0,
  salaryMax: 200000,
  remote: false,
};

interface SavedSearch {
  id: string;
  name: string;
  filters: FilterValues;
}

const parseSalary = (salary: string): number => {
  const numbers = salary.match(/\d+/g);
  if (!numbers) return 0;
  const values = numbers.map((num) => parseInt(num.replace(/[^0-9]/g, ""), 10));
  return values.length > 1
    ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    : values[0];
};

// Normalize experience level for flexible matching
const normalizeExperienceLevel = (level: string | undefined | null): string => {
  if (!level) return "";
  return level.toLowerCase().replace(/[-\s]/g, ""); // Remove hyphens and spaces
};

export default function Jobs() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"date" | "salary" | "applicants">(
    "date"
  );
  const jobsPerPage = 9;

  const debouncedFilters = useDebounce(filters, 300);

  const {
    data: jobs,
    isLoading,
    error,
  } = useQuery<(Job & { applicantsCount: number; views: number })[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const response = await fetch("/api/jobs");
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json();
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem("savedJobSearches");
    if (saved) {
      setSavedSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("savedJobSearches", JSON.stringify(savedSearches));
  }, [savedSearches]);

  useEffect(() => {
    if (jobs) {
      // console.log(
      //   "Jobs data:",
      //   jobs.map((job) => ({
      //     id: job.id,
      //     title: job.title,
      //     experienceLevel: job.experienceLevel,
      //   }))
      // );
    }
  }, [jobs]);

  const handleSaveSearch = (name: string) => {
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      filters: { ...filters },
    };
    setSavedSearches([...savedSearches, newSearch]);
    toast({
      title: "Search Saved",
      description: `Your search "${name}" has been saved.`,
    });
  };

  const handleLoadSearch = (search: SavedSearch) => {
    setFilters(search.filters);
    setPage(1);
    toast({
      title: "Search Loaded",
      description: `Loaded saved search "${search.name}".`,
    });
  };

  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches(savedSearches.filter((search) => search.id !== searchId));
    toast({
      title: "Search Deleted",
      description: "Your saved search has been removed.",
    });
  };

  const filteredAndSortedJobs = useMemo(() => {
    if (!jobs) return [];

    let filtered = [...jobs];

    filtered = filtered.filter((job) => {
      const matchesKeyword =
        !debouncedFilters.keyword ||
        job.title
          .toLowerCase()
          .includes(debouncedFilters.keyword.toLowerCase()) ||
        job.company
          .toLowerCase()
          .includes(debouncedFilters.keyword.toLowerCase()) ||
        job.description
          .toLowerCase()
          .includes(debouncedFilters.keyword.toLowerCase());

      const matchesLocation =
        !debouncedFilters.location ||
        job.location
          .toLowerCase()
          .includes(debouncedFilters.location.toLowerCase());

      const matchesType =
        !debouncedFilters.type ||
        job.type === debouncedFilters.type ||
        (debouncedFilters.type === null && job.type === undefined);

      const normalizedJobExperience = normalizeExperienceLevel(
        job.experienceLevel
      );
      const normalizedFilterExperience = normalizeExperienceLevel(
        debouncedFilters.experienceLevel
      );
      const matchesExperience =
        !debouncedFilters.experienceLevel || // No filter applied
        (normalizedFilterExperience &&
          normalizedJobExperience.includes(normalizedFilterExperience)) || // Flexible match
        (debouncedFilters.experienceLevel === null && !job.experienceLevel); // "Any Level" matches undefined/null

      const salaryNum = parseSalary(job.salary);
      const matchesSalary =
        salaryNum >= (debouncedFilters.salaryMin ?? 0) &&
        salaryNum <= (debouncedFilters.salaryMax ?? 200000);

      const matchesRemote = !debouncedFilters.remote || job.remote === true;

      // console.log("Filtering job:", {
      //   jobId: job.id,
      //   jobExperienceLevel: job.experienceLevel,
      //   normalizedJobExperience,
      //   filterExperienceLevel: debouncedFilters.experienceLevel,
      //   normalizedFilterExperience,
      //   matchesExperience,
      // });

      return (
        matchesKeyword &&
        matchesLocation &&
        matchesType &&
        matchesExperience &&
        matchesSalary &&
        matchesRemote
      );
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "salary":
          const aSalary = parseSalary(a.salary);
          const bSalary = parseSalary(b.salary);
          return bSalary - aSalary;
        case "applicants":
          return (b.applicantsCount || 0) - (a.applicantsCount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [jobs, debouncedFilters, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedJobs.length / jobsPerPage);
  const paginatedJobs = filteredAndSortedJobs.slice(
    (page - 1) * jobsPerPage,
    page * jobsPerPage
  );
  // Function to determine the greeting based on the current time
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else if (hour >= 17 && hour < 22) {
      return "Good Evening";
    } else {
      return "Good Evening";
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">
              {getTimeBasedGreeting()}, {user?.username || "Guest"} Browse Jobs
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as typeof sortBy)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="applicants">Applicants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, company, or skills..."
                    value={filters.keyword}
                    onChange={(e) =>
                      setFilters({ ...filters, keyword: e.target.value })
                    }
                    className="pl-9"
                  />
                </div>
              </div>
              <AdvancedFilters
                filters={filters}
                onChange={(newFilters) => {
                  setFilters(newFilters);
                  setPage(1);
                }}
                onSaveSearch={handleSaveSearch}
              />
            </div>

            {savedSearches.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Bookmark className="h-4 w-4 mr-1" />
                  Saved Searches:
                </span>
                {savedSearches.map((search) => (
                  <Badge
                    key={search.id}
                    variant="secondary"
                    className="flex items-center gap-1 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleLoadSearch(search)}
                  >
                    {search.name}
                    <X
                      className="h-3 w-3 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSearch(search.id);
                      }}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>
              Showing {paginatedJobs.length} of {filteredAndSortedJobs.length}{" "}
              jobs
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="self-center">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            Error loading jobs: {(error as Error).message}
          </div>
        ) : filteredAndSortedJobs.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No jobs found matching your criteria.
          </div>
        )}

        {filteredAndSortedJobs.length > 0 && (
          <div className="mt-8 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
