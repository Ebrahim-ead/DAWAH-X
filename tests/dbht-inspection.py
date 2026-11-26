#!/usr/bin/env python3
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('dbht', pathlib.Path(__file__).resolve().parents[1] / 'tools/inspect-dbht-hadith.py')
dbht = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dbht)

class InspectionTest(unittest.TestCase):
    def test_sombhar_candidate_and_mismatch(self):
        post = {'id': 7, 'title': 'হাদীস ২৫৯৭', 'content': '''[tab title="বাংলা"]<p>কিতাব:- হাদীস সম্ভার :: অধ্যায়- বিবাহ :: হাদীস ২৫৯৮</p><p>বাংলা পাঠ</p>[/tab][tab title="العربية"]<p>بِسْمِ</p>[/tab][tab title="সমস্যা"]secret[/tab]'''}
        result = dbht.inspect(post)
        self.assertEqual(result['group'], 'sombhar')
        self.assertEqual(result['title_number'], 2597)
        self.assertEqual(result['body_number'], 2598)
        self.assertTrue(result['has_arabic'])
        self.assertNotIn('secret', repr(result))
        self.assertEqual(len(dbht.summarize([result], {'sombhar': 2})['sombhar']['title_body_mismatch']), 1)

    def test_daif_and_missing_arabic(self):
        row = dbht.inspect({'id': 2, 'title': 'যয়িফ ও জাল হাদিস সিরিজ : হাদীস নং ১', 'content': '[tab title="বাংলা"]<p>হাদীস নং-১</p><p>হাদীসটি বাতিল</p>[/tab][tab title="العربية"][/tab]'})
        self.assertEqual(row['body_number'], 1)
        self.assertFalse(row['has_arabic'])
        summary = dbht.summarize([row, row], {'daif': 2})['daif']
        self.assertEqual(summary['title_missing'], [2])
        self.assertEqual(summary['title_duplicates'], {'1': 2})
        self.assertEqual(summary['missing_arabic_text'], 2)

    def test_ignores_unrelated_and_scripts(self):
        self.assertIsNone(dbht.inspect({'id': 3, 'title': 'হাদীস ৩', 'content': '[tab title="বাংলা"]অন্য গ্রন্থ[/tab]'}))
        row = dbht.inspect({'id': 4, 'title': 'হাদীস সম্ভার ১', 'content': '[tab title="বাংলা"]<script>বাংলা</script>[/tab][tab title="العربية"]<style>عرب</style>[/tab]'})
        self.assertFalse(row['has_bangla'])
        self.assertFalse(row['has_arabic'])

if __name__ == '__main__':
    unittest.main()
