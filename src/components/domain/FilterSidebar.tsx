import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function FilterSidebar() {
  return (
    <div className="w-[250px] border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold">Filters</h2>
        <button className="text-xs text-muted-foreground hover:underline">Reset</button>
      </div>

      <Accordion type="multiple" defaultValue={["set", "availability"]} className="w-full">
        <AccordionItem value="set">
          <AccordionTrigger>Set</AccordionTrigger>
          <AccordionContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="ema" />
              <Label htmlFor="ema">Eternal Masters</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="lea" />
              <Label htmlFor="lea">Alpha</Label>
            </div>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="availability">
          <AccordionTrigger>Availability</AccordionTrigger>
          <AccordionContent className="space-y-2">
             <div className="flex items-center space-x-2">
               <Checkbox id="instock" defaultChecked />
               <Label htmlFor="instock">In Stock</Label>
             </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}