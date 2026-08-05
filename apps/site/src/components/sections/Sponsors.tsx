import React from 'react';
import { motion } from 'motion/react';
import { SectionTitle } from '../shared/SectionTitle';
import diamondImage from '../../assets/Diamante.png';
import supportersImage from '../../assets/apoiadores (2).png';
import goldImage from '../../assets/Ouro.png';
import silverImage from '../../assets/Prata.png';

export const Sponsors = () => {
  return (
    <section
      id="patrocinadores"
      className="relative overflow-hidden bg-[linear-gradient(180deg,#061539_0%,#0a1b4d_48%,#08163f_100%)] py-20 md:py-24 xl:py-28"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:120px_120px]" />
        <div className="absolute left-[-6rem] top-[-5rem] h-64 w-64 bg-[radial-gradient(circle,_rgba(249,214,0,0.16)_0%,transparent_70%)] sm:h-80 sm:w-80" />
        <div className="absolute right-[-7rem] top-[14%] h-72 w-72 bg-[radial-gradient(circle,_rgba(255,255,255,0.08)_0%,transparent_72%)] sm:h-96 sm:w-96" />
        <div className="absolute bottom-[-8rem] left-1/2 h-72 w-72 -translate-x-1/2 bg-[radial-gradient(circle,_rgba(249,214,0,0.09)_0%,transparent_72%)] sm:h-[28rem] sm:w-[28rem]" />
      </div>

      <div className="relative mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <SectionTitle
          title="Patrocinadores e Apoiadores"
          titleClassName="past-editions-title-montserrat-black"
          centered
          light
        />

        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 sm:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_30px_90px_-56px_rgba(6,21,57,0.72)] sm:p-6"
          >
            <img
              src={diamondImage}
              alt="Patrocinadores Diamante"
              className="h-auto w-full object-contain"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease: 'easeOut', delay: 0.06 }}
            className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_30px_90px_-56px_rgba(6,21,57,0.72)] sm:p-6"
          >
            <img
              src={goldImage}
              alt="Patrocinadores Ouro"
              className="h-auto w-full object-contain"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease: 'easeOut', delay: 0.12 }}
            className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_30px_90px_-56px_rgba(6,21,57,0.72)] sm:p-6"
          >
            <img
              src={silverImage}
              alt="Patrocinadores Prata"
              className="h-auto w-full object-contain"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.65, ease: 'easeOut', delay: 0.18 }}
            className="w-full overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_30px_90px_-56px_rgba(6,21,57,0.72)] sm:p-6"
          >
            <img
              src={supportersImage}
              alt="Apoiadores"
              className="h-auto w-full object-contain"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
