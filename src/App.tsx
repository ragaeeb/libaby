import { TooltipProvider } from "@/components/ui/tooltip";
import { ApplicationShell1 } from "@/components/application-shell1";

function App() {
  return (
    <TooltipProvider>
      <ApplicationShell1 />
    </TooltipProvider>
  );
}

export default App;
