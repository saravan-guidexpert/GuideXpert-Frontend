import { useEffect } from 'react';
import JeeSessionForm from '../components/jeeSession/JeeSessionForm';

export default function JeeSessionPage() {
  useEffect(() => {
    document.title = 'JEE Session Registration | GuideXpert';
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10 selection:bg-[#c7f36b] selection:text-[#0F172A] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <JeeSessionForm />
      </div>
    </div>
  );
}
