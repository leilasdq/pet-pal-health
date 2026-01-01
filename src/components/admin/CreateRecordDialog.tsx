import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';

interface CreateRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  onSave: (data: Record<string, any>) => Promise<void>;
}

// Fields that are auto-generated and should not be shown
const AUTO_GENERATED_FIELDS = ['id', 'created_at', 'updated_at'];

// Table-specific required fields configuration
const TABLE_FIELDS: Record<string, { field: string; type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'boolean'; options?: string[]; required?: boolean }[]> = {
  profiles: [
    { field: 'email', type: 'text', required: true },
    { field: 'full_name', type: 'text' },
    { field: 'preferred_language', type: 'select', options: ['fa', 'en'] },
    { field: 'email_notifications_enabled', type: 'boolean' },
    { field: 'push_notifications_enabled', type: 'boolean' },
  ],
  pets: [
    { field: 'user_id', type: 'text', required: true },
    { field: 'name', type: 'text', required: true },
    { field: 'pet_type', type: 'select', options: ['dog', 'cat', 'bird', 'fish', 'rabbit', 'hamster', 'other'], required: true },
    { field: 'breed', type: 'text' },
    { field: 'birth_date', type: 'date' },
    { field: 'weight', type: 'number' },
  ],
  reminders: [
    { field: 'pet_id', type: 'text', required: true },
    { field: 'title', type: 'text', required: true },
    { field: 'reminder_type', type: 'select', options: ['vaccination', 'medication', 'vet_visit', 'grooming', 'feeding', 'exercise', 'other'], required: true },
    { field: 'due_date', type: 'date', required: true },
    { field: 'recurrence', type: 'select', options: ['none', 'daily', 'weekly', 'monthly', 'yearly'] },
    { field: 'status', type: 'select', options: ['pending', 'completed'] },
    { field: 'notes', type: 'textarea' },
  ],
  medical_records: [
    { field: 'pet_id', type: 'text', required: true },
    { field: 'title', type: 'text' },
    { field: 'category', type: 'select', options: ['vaccination', 'checkup', 'surgery', 'medication', 'lab_results', 'imaging', 'other'], required: true },
    { field: 'image_path', type: 'text', required: true },
    { field: 'record_date', type: 'date' },
    { field: 'notes', type: 'textarea' },
  ],
  conversations: [
    { field: 'user_id', type: 'text', required: true },
    { field: 'title', type: 'text' },
    { field: 'pet_id', type: 'text' },
  ],
  chat_messages: [
    { field: 'user_id', type: 'text', required: true },
    { field: 'conversation_id', type: 'text' },
    { field: 'role', type: 'select', options: ['user', 'assistant'], required: true },
    { field: 'content', type: 'textarea', required: true },
  ],
  ai_usage: [
    { field: 'user_id', type: 'text', required: true },
    { field: 'month_year', type: 'text', required: true },
    { field: 'chatbot_count', type: 'number' },
    { field: 'analysis_count', type: 'number' },
  ],
  payments: [
    { field: 'user_id', type: 'text', required: true },
    { field: 'tier_id', type: 'text', required: true },
    { field: 'original_amount', type: 'number', required: true },
    { field: 'final_amount', type: 'number', required: true },
    { field: 'status', type: 'select', options: ['pending', 'completed', 'failed', 'refunded'] },
    { field: 'gateway', type: 'select', options: ['zarinpal'] },
  ],
  user_subscriptions: [
    { field: 'user_id', type: 'text', required: true },
    { field: 'tier_id', type: 'text', required: true },
    { field: 'status', type: 'select', options: ['active', 'expired', 'pending', 'cancelled'] },
    { field: 'starts_at', type: 'date' },
    { field: 'expires_at', type: 'date' },
  ],
  promo_codes: [
    { field: 'code', type: 'text', required: true },
    { field: 'discount_type', type: 'select', options: ['percentage', 'fixed_amount', 'free_tier'], required: true },
    { field: 'discount_value', type: 'number' },
    { field: 'is_active', type: 'boolean' },
    { field: 'max_uses', type: 'number' },
    { field: 'valid_until', type: 'date' },
    { field: 'free_tier_id', type: 'text' },
  ],
  promo_code_usage: [
    { field: 'user_id', type: 'text', required: true },
    { field: 'promo_code_id', type: 'text', required: true },
    { field: 'payment_id', type: 'text' },
  ],
  subscription_tiers: [
    { field: 'name', type: 'text', required: true },
    { field: 'display_name_fa', type: 'text', required: true },
    { field: 'monthly_limit', type: 'number' },
    { field: 'price_toman', type: 'number' },
    { field: 'grace_buffer', type: 'number' },
    { field: 'is_active', type: 'boolean' },
  ],
  user_roles: [
    { field: 'user_id', type: 'text', required: true },
    { field: 'role', type: 'select', options: ['admin', 'moderator', 'user'], required: true },
  ],
  admin_invites: [
    { field: 'email', type: 'text', required: true },
    { field: 'invited_by', type: 'text', required: true },
    { field: 'role', type: 'select', options: ['admin', 'moderator'] },
    { field: 'expires_at', type: 'date' },
  ],
};

export const CreateRecordDialog = ({ open, onOpenChange, tableName, onSave }: CreateRecordDialogProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const fields = TABLE_FIELDS[tableName] || [];

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filter out empty values
      const dataToSave: Record<string, any> = {};
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== '' && formData[key] !== undefined && formData[key] !== null) {
          dataToSave[key] = formData[key];
        }
      });
      
      await onSave(dataToSave);
      setFormData({});
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderField = (fieldConfig: { field: string; type: string; options?: string[]; required?: boolean }) => {
    const { field, type, options, required } = fieldConfig;

    if (type === 'boolean') {
      return (
        <div key={field} className="space-y-2">
          <Label>{field} {required && <span className="text-destructive">*</span>}</Label>
          <Select
            value={formData[field] === true ? 'true' : formData[field] === false ? 'false' : ''}
            onValueChange={(v) => handleChange(field, v === 'true')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select' && options) {
      return (
        <div key={field} className="space-y-2">
          <Label>{field} {required && <span className="text-destructive">*</span>}</Label>
          <Select
            value={formData[field] || ''}
            onValueChange={(v) => handleChange(field, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'date') {
      return (
        <div key={field} className="space-y-2">
          <Label>{field} {required && <span className="text-destructive">*</span>}</Label>
          <Input
            type="date"
            value={formData[field] || ''}
            onChange={(e) => handleChange(field, e.target.value || null)}
          />
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div key={field} className="space-y-2">
          <Label>{field} {required && <span className="text-destructive">*</span>}</Label>
          <Textarea
            value={formData[field] || ''}
            onChange={(e) => handleChange(field, e.target.value || null)}
            rows={3}
          />
        </div>
      );
    }

    if (type === 'number') {
      return (
        <div key={field} className="space-y-2">
          <Label>{field} {required && <span className="text-destructive">*</span>}</Label>
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
        <Label>{field} {required && <span className="text-destructive">*</span>}</Label>
        <Input
          value={formData[field] ?? ''}
          onChange={(e) => handleChange(field, e.target.value || null)}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('admin.createRecord')} - {tableName}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {fields.map((fieldConfig) => renderField(fieldConfig))}
        </div>
        {fields.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No fields configured for this table
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || fields.length === 0}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
