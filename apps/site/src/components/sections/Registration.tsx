import React from 'react';
import { motion } from 'motion/react';
import { SectionTitle } from '../shared/SectionTitle';
import { CTAButton } from '../shared/CTAButton';
import { eventData } from '../../config/eventData';
import { PremiumHeroBackground } from '../shared/PremiumHeroBackground';
import pontebranca from '../../assets/pontebranca.png';

export const Registration = () => {
  return (
    <section id="inscricoes" className="relative overflow-hidden bg-[#061539] py-20 md:py-32">
      <PremiumHeroBackground />

      <motion.div
        initial={{ opacity: 0, x: -18, y: 12, scale: 0.98 }}
        whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.82, ease: 'easeOut', delay: 0.08 }}
        className="pointer-events-none absolute bottom-0 left-0 z-[1] w-[36rem] sm:w-[45rem] md:w-[54rem] lg:w-[68rem] xl:w-[76rem]"
        aria-hidden="true"
      >
        <img
          src={pontebranca}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          width={998}
          height={250}
          className="block h-auto w-full object-contain opacity-[0.16] sm:opacity-[0.18] md:opacity-[0.2] lg:opacity-[0.24]"
        />
      </motion.div>

      <div className="container relative z-10 mx-auto px-4 md:px-6 lg:px-8">
        <SectionTitle title="Inscrições" subtitle="Garanta sua participação" light centered />

        <div className="relative z-10 mx-auto mt-2 w-full max-w-4xl">
          <div
            className={`grid w-full grid-cols-1 justify-items-stretch gap-6 ${
              eventData.registration.batches.length > 1 ? 'md:grid-cols-2' : 'mx-auto max-w-md'
            }`}
          >
            {eventData.registration.batches.map((batch, index) => {
              const isActive = batch.status === 'active';
              const isUpcoming = batch.status === 'upcoming';
              const showCurrentBadge = isActive;

              return (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative rounded-2xl p-6 flex flex-col h-full ${
                    isActive 
                      ? 'bg-white text-gray-900 shadow-2xl scale-105 z-10 border-2 border-idasan-yellow' 
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors'
                  } ${isUpcoming ? 'opacity-70 grayscale' : ''}`}
                >
                  {/* Badge */}
                  {showCurrentBadge && (
                    <div className="type-button absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-idasan-yellow px-4 py-1 text-[0.62rem] text-idasan-blue shadow-lg">
                      Lote Atual
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-6 text-center border-b border-gray-200/10 pb-6">
                    <h3 className={`type-card-title mb-2 ${isActive ? 'text-idasan-blue' : 'text-white'}`}>
                      {batch.name}
                    </h3>
                    <p className={`type-body-xs ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                      {batch.period}
                    </p>
                    {batch.limit && (
                      <p className="type-eyebrow mt-2 !text-[0.62rem] text-red-500">
                        {batch.limit}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  {batch.description && (
                    <p className={`type-body-sm mb-6 text-center italic ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                      {batch.description}
                    </p>
                  )}

                  {/* Prices */}
                  <div className="space-y-4 mb-8 flex-grow">
                    {batch.prices.map((price) => (
                      <div key={price.label} className="type-body-sm flex items-start justify-between gap-4">
                        <span className={`flex-1 text-left ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>{price.label}</span>
                        <span className={`shrink-0 text-right font-semibold ${isActive ? 'text-idasan-blue' : 'text-white'}`}>
                          {price.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action */}
                  <div className="mt-auto">
                    {isActive ? (
                      <CTAButton href="#" fullWidth variant="primary" className="text-sm">
                        Inscrever-se
                      </CTAButton>
                    ) : (
                      <button disabled className="type-button w-full cursor-not-allowed rounded-xl border border-white/5 bg-white/5 py-3 text-white/30">
                        {isUpcoming ? 'Em Breve' : 'Encerrado'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        
        <div className="mt-12 flex flex-col items-center text-center">
          <p className="type-body-sm mb-4 text-white/78">
            {eventData.registration.closingNotice}
          </p>
          <p className="type-body-sm inline-flex rounded-full border border-white/10 bg-[#0a1b4d]/92 px-5 py-2 text-white/72 shadow-[0_18px_40px_-28px_rgba(6,21,57,0.65)]">
            Precisa de nota de empenho? Veja as instruções abaixo.
          </p>
          <div className="mt-3 flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0a1b4d]/92 shadow-[0_18px_40px_-28px_rgba(6,21,57,0.65)]"
            >
              <motion.div
                animate={{ y: [-3, 2, -3] }}
                transition={{ duration: 1.45, ease: 'easeInOut', repeat: Infinity }}
                className="h-3.5 w-3.5 rotate-45 border-b border-r border-white/30"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
