import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

interface EditRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: Record<string, any> | null;
  tableName: string;
  onSave: (id: string, data: Record<string, any>) => Promise<void>;
}

// Fields that should not be editable
const NON_EDITABLE_FIELDS = ['id', 'created_at', 'updated_at', 'user_id', 'pet_id', 'invited_by'];

// Fields with special input types
const DATE_FIELDS = ['birth_date', 'due_date', 'record_date', 'expires_at', 'starts_at', 'used_at', 'ai_analyzed_at'];
const TEXTAREA_FIELDS = ['notes', 'content', 'ai_analysis', 'bio'];
const SELECT_FIELDS: Record<string, string[]> = {
  status: ['pending', 'completed', 'active', 'expired', 'cancelled', 'failed', 'refunded'],
  role: ['admin', 'moderator', 'user'],
  pet_type: ['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other'],
  recurrence: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
  reminder_type: ['vaccination', 'medication', 'vet_visit', 'grooming', 'feeding', 'exercise', 'other'],
  category: ['vaccination', 'checkup', 'surgery', 'medication', 'lab_results', 'imaging', 'other'],
  preferred_language: ['fa', 'en'],
  discount_type: ['percentage', 'fixed_amount', 'free_tier'],
  gateway: ['zarinpal'],
};

const BOOLEAN_FIELDS = ['is_active', 'email_notifications_enabled', 'push_notifications_enabled'];

export const EditRecordDialog = ({ open, onOpenChange, record, tableName, onSave }: EditRecordDialogProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setFormData({ ...record });
    }
  }, [record]);

  const handleSave = async () => {
    if (!record) return;
    
    setSaving(true);
    try {
      // Filter out non-editable fields
      const editableData: Record<string, any> = {};
      Object.keys(formData).forEach((key) => {
        if (!NON_EDITABLE_FIELDS.includes(key) && formData[key] !== record[key]) {
          editableData[key] = formData[key];
        }
      });
      
      await onSave(record.id, editableData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderField = (field: string, value: any) => {
    if (NON_EDITABLE_FIELDS.includes(field)) {
      return (
        <div key={field} className="space-y-2">
          <Label className="text-muted-foreground">{field}</Label>
          <Input value={String(value ?? '')} disabled className="bg-muted" />
        </div>
      );
    }

    if (BOOLEAN_FIELDS.includes(field)) {
      return (
        <div key={field} className="space-y-2">
          <Label>{field}</Label>
          <Select
            value={formData[field] ? 'true' : 'false'}
            onValueChange={(v) => handleChange(field, v === 'true')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (SELECT_FIELDS[field]) {
      return (
        <div key={field} className="space-y-2">
          <Label>{field}</Label>
          <Select
            value={formData[field] || ''}
            onValueChange={(v) => handleChange(field, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field}`} />
            </SelectTrigger>
            <SelectContent>
              {SELECT_FIELDS[field].map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (DATE_FIELDS.includes(field)) {
      const dateValue = formData[field] ? new Date(formData[field]).toISOString().split('T')[0] : '';
      return (
        <div key={field} className="space-y-2">
          <Label>{field}</Label>
          <Input
            type="date"
            value={dateValue}
            onChange={(e) => handleChange(field, e.target.value || null)}
          />
        </div>
      );
    }

    if (TEXTAREA_FIELDS.includes(field)) {
      return (
        <div key={field} className="space-y-2">
          <Label>{field}</Label>
          <Textarea
            value={formData[field] || ''}
            onChange={(e) => handleChange(field, e.target.value || null)}
            rows={3}
          />
        </div>
      );
    }

    // Number fields
    if (typeof value === 'number') {
      return (
        <div key={field} className="space-y-2">
          <Label>{field}</Label>
          <Input
            type="number"
            value={formData[field] ?? ''}
            onChange={(e) => handleChange(field, e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      );
    }

    // Default text input
    return (
      <div key={field} className="space-y-2">
        <Label>{field}</Label>
        <Input
          value={formData[field] ?? ''}
          onChange={(e) => handleChange(field, e.target.value || null)}
        />
      </div>
    );
  };

  if (!record) return null;

  const fields = Object.keys(record).filter((key) => !key.startsWith('profiles'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('admin.editRecord')} - {tableName}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {fields.map((field) => renderField(field, record[field]))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
