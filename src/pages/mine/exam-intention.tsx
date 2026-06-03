import { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { AuthGuard } from '@/components/AuthGuard'
import { PageHeader } from '@/components/PageHeader'
import { FormInput } from '@/components/FormInput'
import { Button } from '@/components/Button'
import { STRINGS } from '@/constants/strings'
import { getExamIntentions } from '@/services/dataService'
import styles from './exam-intention.module.scss'

const CATEGORIES = ['H3CNE', 'H3CSE', 'H3CIE', 'SCSA', 'SCSP', 'SCSI', 'NISP', STRINGS.TAG_RENSHE]

export default function ExamIntentionPage() {
  const existing = getExamIntentions()
  const [selected, setSelected] = useState<string[]>(
    existing.length > 0 ? [existing[0].category] : []
  )
  const [notes, setNotes] = useState(existing[0]?.notes || '')

  const toggleCategory = (cat: string) => {
    setSelected(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const handleSave = () => {
    Taro.showToast({ title: STRINGS.MINE_EXAM_INTENTION_SAVED, icon: 'success' })
  }

  return (
    <AuthGuard>
      <View className={styles.page}>
        <PageHeader title={STRINGS.MINE_EXAM_INTENTION_TITLE} shouldShowBack />
        <ScrollView className={styles.body} scrollY>
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>{STRINGS.MINE_EXAM_INTENTION_HINT}</Text>
            <View className={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <View
                  key={cat}
                  className={`${styles.catItem} ${selected.includes(cat) ? styles.catActive : ''}`}
                  onClick={() => toggleCategory(cat)}
                >
                  <Text className={`${styles.catText} ${selected.includes(cat) ? styles.catTextActive : ''}`}>
                    {cat}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className={styles.section}>
            <FormInput
              label={STRINGS.FORM_NOTES}
              placeholder={STRINGS.FORM_NOTES_PLACEHOLDER}
              value={notes}
              onChange={setNotes}
            />
          </View>

          <View className={styles.btnWrap}>
            <Button variant='gradient' size='lg' onClick={handleSave}>
              {STRINGS.MINE_EXAM_INTENTION_SAVE}
            </Button>
          </View>
        </ScrollView>
      </View>
    </AuthGuard>
  )
}
