import { Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PageTipProps {
  content: string;
  title?: string;
}

const PageTip = ({ content, title = 'Page Info' }: PageTipProps) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
        <Info className="h-4 w-4" />
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display">{title}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
    </DialogContent>
  </Dialog>
);

export default PageTip;
