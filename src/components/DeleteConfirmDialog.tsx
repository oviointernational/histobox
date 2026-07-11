import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title = 'Are you sure you want to delete?',
  description = 'This action cannot be undone.',
}: DeleteConfirmDialogProps) => {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [answer, setAnswer] = useState('');

  const generate = useCallback(() => {
    setA(randomInt(1, 20));
    setB(randomInt(1, 20));
    setAnswer('');
  }, []);

  useEffect(() => {
    if (open) generate();
  }, [open, generate]);

  const isCorrect = answer.trim() !== '' && parseInt(answer.trim(), 10) === a + b;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm font-medium">
            Solve to confirm: <span className="font-mono text-primary text-base">{a} + {b} = ?</span>
          </p>
          <Input
            placeholder="Your answer"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && isCorrect) {
                onConfirm();
                onOpenChange(false);
              }
            }}
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!isCorrect}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmDialog;
