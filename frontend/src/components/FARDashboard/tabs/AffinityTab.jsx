import { Stack } from "@mui/material";
import AffinityMatrixHeatmap from "../AffinityMatrixHeatMap";

export default function AffinityTab({ affinityMatrixData }) {
  return (
    <Stack spacing={3}>
      {affinityMatrixData?.matrix ? (
        <AffinityMatrixHeatmap
          title="Customer Affinity Matrix"
          matrix={affinityMatrixData.matrix}
          defaultAttribute="riskLevel" // optional default
        />
      ) : (
        <p>No affinity matrix data available.</p>
      )}
    </Stack>
  );
}
