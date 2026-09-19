import { useQuery } from "@tanstack/react-query";
import { qk } from "@/shared/lib/query/keys";
import { atlasAPI } from "../api/atlas.api";

// Manifest (2234 qism + 3432 tushuncha) - sessiya davomida o'zgarmaydi.
export const useAtlasQuery = () =>
  useQuery({
    queryKey: qk.humanAtlas.manifest(),
    queryFn: ({ signal }) => atlasAPI.manifest(signal),
    staleTime: Infinity,
    gcTime: Infinity,
  });
