import React, { useState } from 'react';
import Step1SchoolSettings from './Step1SchoolSettings';
import Step2Teachers from './Step2Teachers';
import Step3ClassesSubjects from './Step3ClassesSubjects';
import Step4TeacherAssignment from './Step4TeacherAssignment';
import Step5Constraints from './Step5Constraints';
import Step6Generate from './Step6Generate';

interface WizardLayoutProps {
  onGenerateComplete: () => void;
}

const steps = [
  { id: 1, title: 'School Settings' },
  { id: 2, title: 'Teachers' },
  { id: 3, title: 'Classes & Subjects' },
  { id: 4, title: 'Teacher Assignment' },
  { id: 5, title: 'Constraints' },
  { id: 6, title: 'Generate' },
];

export const WizardLayout: React.FC<WizardLayoutProps> = ({ onGenerateComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 font-sans">
      {/* Top Progress Bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Timetable Generator</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Create and manage timetable for all classes from 1A to 10B.</p>
          </div>
          
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                  currentStep === step.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : currentStep > step.id 
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {step.id}
                </div>
                <span className={`ml-3 text-xs font-semibold ${
                  currentStep === step.id ? 'text-slate-900' : 'text-slate-400'
                } hidden md:block`}>
                  {step.title}
                </span>
                {idx < steps.length - 1 && (
                  <div className={`w-8 md:w-16 h-px mx-4 ${
                    currentStep > step.id ? 'bg-blue-200' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto min-h-[500px]">
          {currentStep === 1 && <Step1SchoolSettings onNext={nextStep} />}
          {currentStep === 2 && <Step2Teachers onNext={nextStep} onPrev={prevStep} />}
          {currentStep === 3 && <Step3ClassesSubjects onNext={nextStep} onPrev={prevStep} />}
          {currentStep === 4 && <Step4TeacherAssignment onNext={nextStep} onPrev={prevStep} />}
          {currentStep === 5 && <Step5Constraints onNext={nextStep} onPrev={prevStep} />}
          {currentStep === 6 && <Step6Generate onPrev={prevStep} onGenerateComplete={onGenerateComplete} />}
        </div>
      </div>
    </div>
  );
};
