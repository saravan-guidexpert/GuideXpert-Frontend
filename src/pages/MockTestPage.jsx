import { useEffect } from 'react';
import MockTestForm from '../components/mockTest/MockTestForm';

export default function MockTestPage() {
  useEffect(() => {
    document.title = 'Mock Test Registration | GuideXpert';
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10 selection:bg-[#c7f36b] selection:text-[#0F172A] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <MockTestForm />
      </div>
    </div>
  );
}
