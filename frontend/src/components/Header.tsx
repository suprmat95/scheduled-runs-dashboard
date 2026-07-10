import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface Props {
  onCreate: () => void;
}

// Greeting + primary action, per the mockup's top bar.
export function Header({ onCreate }: Props) {
  return (
    <Stack
      direction="row"
      sx={{ mb: 3, justifyContent: "space-between", alignItems: "center" }}
    >
      <Box>
        <Typography variant="h5">Good afternoon, User</Typography>
        <Typography variant="body2" color="text.secondary">
          Here is your automation monitoring overview
        </Typography>
      </Box>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
        Create Automation
      </Button>
    </Stack>
  );
}
