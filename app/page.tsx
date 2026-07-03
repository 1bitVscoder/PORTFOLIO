import { Hero } from '@/components/sections/Hero';
import { Philosophy } from '@/components/sections/Philosophy';
import { ServicesV2 } from '@/components/sections/ServicesV2';
import { Projects } from '@/components/sections/Projects';
import { Archive } from '@/components/sections/Archive';
import { Workflow } from '@/components/sections/Workflow';
import { QuoteReveal } from '@/components/sections/QuoteReveal';
import { Contact } from '@/components/sections/Contact';
import { WelcomeScreen } from '@/components/ui/WelcomeScreen';

export default function Home() {
  return (
    <>
      <WelcomeScreen />
      <Hero />
      <Philosophy />
      <ServicesV2 />
      <Projects />
      <Archive />
      <Workflow />
      <QuoteReveal />
      <Contact />
    </>
  );
}
