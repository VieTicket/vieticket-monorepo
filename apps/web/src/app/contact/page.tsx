"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Icons
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Headphones,
  Users,
  Building,
  Globe,
} from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contact");
  const glowRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for glow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        const { clientX, clientY } = e;
        glowRef.current.style.left = `${clientX}px`;
        glowRef.current.style.top = `${clientY}px`;
        glowRef.current.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      if (glowRef.current) {
        glowRef.current.style.opacity = '0';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const contactInfo = [
    {
      icon: Phone,
      title: t("contactInfo.phone.title"),
      details: [t("contactInfo.phone.details.0")],
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Mail,
      title: t("contactInfo.email.title"),
      details: [
        t("contactInfo.email.details.0"),
        t("contactInfo.email.details.1"),
      ],
      color: "text-[#2A273F]",
      bgColor: "bg-yellow-50",
    },
    {
      icon: MapPin,
      title: t("contactInfo.address.title"),
      details: [t("contactInfo.address.details.0")],
      color: "text-red-500",
      bgColor: "bg-red-50",
    },
    {
      icon: Clock,
      title: t("contactInfo.hours.title"),
      details: [
        t("contactInfo.hours.details.0"),
        t("contactInfo.hours.details.1"),
      ],
      color: "text-[#3A3555]",
      bgColor: "bg-blue-50",
    },
  ];

  const supportCategories = [
    {
      icon: Headphones,
      title: t("support.categories.customer.title"),
      description: t("support.categories.customer.description"),
      response: t("support.categories.customer.response"),
    },
    {
      icon: Building,
      title: t("support.categories.business.title"),
      description: t("support.categories.business.description"),
      response: t("support.categories.business.response"),
    },
    {
      icon: Users,
      title: t("support.categories.partnership.title"),
      description: t("support.categories.partnership.description"),
      response: t("support.categories.partnership.response"),
    },
    {
      icon: Globe,
      title: t("support.categories.media.title"),
      description: t("support.categories.media.description"),
      response: t("support.categories.media.response"),
    },
  ];

  const faqItems = [
    {
      question: t("faq.items.booking.question"),
      answer: t("faq.items.booking.answer"),
    },
    {
      question: t("faq.items.cancellation.question"),
      answer: t("faq.items.cancellation.answer"),
    },
    {
      question: t("faq.items.eticket.question"),
      answer: t("faq.items.eticket.answer"),
    },
  ];

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 bg-slate-950" style={{ zIndex: 0 }} />
      
      {/* Gradient overlays */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" style={{ zIndex: 1 }} />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" style={{ zIndex: 1 }} />
      
      {/* Mouse glow effect */}
      <div 
        ref={glowRef}
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none mix-blend-mode-screen transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(139,92,246,0) 70%)',
          filter: 'blur(20px)',
          transform: 'translate(-50%, -50%)',
          zIndex: 2
        }}
      />

      <div className="relative z-10 min-h-screen">
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-violet-300 to-purple-200 bg-clip-text text-transparent">
              {t("hero.title")}
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              {t("hero.subtitle")}
            </p>
          </div>
        </section>

        {/* Contact Info */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactInfo.map((info, index) => {
                const Icon = info.icon;
                return (
                  <Card key={index} className="text-center group bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 hover:border-violet-400/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className={`inline-flex p-4 rounded-full ${info.bgColor.replace('bg-', 'bg-').replace('-50', '-900/30')} mb-4 group-hover:scale-110 transition-transform border border-opacity-30`}>
                        <Icon className={`w-6 h-6 ${info.color}`} />
                      </div>
                      <h3 className="font-semibold text-white mb-3">{info.title}</h3>
                      <div className="space-y-1">
                        {info.details.map((detail, i) => (
                          <p key={i} className="text-sm text-slate-300">{detail}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Support Categories */}
        <section className="py-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                {t("support.title")}
              </h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                {t("support.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {supportCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Card key={index} className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 hover:border-violet-400/30 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-violet-900/30 to-purple-900/30 group-hover:from-violet-800/40 group-hover:to-purple-800/40 transition-colors border border-violet-400/30">
                          <Icon className="w-6 h-6 text-violet-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-2">{category.title}</h3>
                          <p className="text-slate-300 text-sm mb-3">{category.description}</p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-slate-400">{category.response}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-10 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                {t("faq.title")}
              </h2>
              <p className="text-lg text-slate-300">
                {t("faq.subtitle")}
              </p>
            </div>

            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <Card key={index} className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 hover:border-violet-400/30 hover:shadow-md transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-start gap-3 text-lg">
                      <MessageSquare className="w-5 h-5 text-violet-400 mt-1 flex-shrink-0" />
                      <span className="text-white">{item.question}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="ml-8 text-slate-300 leading-relaxed">
                      {item.answer}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <p className="text-slate-300 mb-4">
                Không tìm thấy câu trả lời? Hãy liên hệ trực tiếp với chúng tôi
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="tel:19001234"
                  className="bg-violet-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-violet-700 transition-colors flex items-center gap-2 justify-center"
                >
                  <Phone className="w-4 h-4" />
                  Gọi ngay: 0766 567 846
                </a>
                <a 
                  href="mailto:support@vieticket.com"
                  className="border-2 border-violet-400 text-violet-300 px-6 py-3 rounded-lg font-semibold hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-2 justify-center"
                >
                  <Mail className="w-4 h-4" />
                  Email hỗ trợ
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                {t("office.title")}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">
                  {t("office.headquarters")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-400 mt-1" />
                    <div>
                      <p className="font-medium text-white">{t("office.details.address.title")}</p>
                      <p className="text-slate-300">{t("office.details.address.line1")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="font-medium text-white">{t("office.details.hours.title")}</p>
                      <p className="text-slate-300">{t("office.details.hours.weekdays")}</p>
                      <p className="text-slate-300">{t("office.details.hours.saturday")}</p>
                      <p className="text-slate-300">{t("office.details.hours.sunday")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-green-400 mt-1" />
                    <div>
                      <p className="font-medium text-white">{t("office.details.phone.title")}</p>
                      <p className="text-slate-300">{t("office.details.phone.hotline")}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 rounded-xl h-80 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300">{t("office.mapPlaceholder")}</p>
                  <p className="text-sm text-slate-400 mt-2">
                    {t("office.mapDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}