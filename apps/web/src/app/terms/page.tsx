"use client";

import { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, Users, Building } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("terms");
  const glowRef = useRef<HTMLDivElement>(null);

  // Helper function to parse simple markdown bold
  const parseMarkdown = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-violet-300">$1</strong>');
  };

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

      {/* Global styles for bold numbers */}
      <style jsx>{`
        .terms-content strong,
        .terms-content b,
        .terms-content [class*="font-bold"] {
          font-weight: 700;
          color: #f1f5f9;
        }
        .terms-content .percentage,
        .terms-content .money,
        .terms-content .number {
          font-weight: 800;
          color: #c084fc;
        }
      `}</style>

      <div className="relative z-10 min-h-screen terms-content">
        {/* Hero Section */}
        <section className="relative py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-violet-400/20 backdrop-blur-sm px-4 py-2 rounded-full text-violet-300 text-sm font-medium mb-6 border border-violet-400/30">
              <Shield className="w-4 h-4" />
              {t("hero.badge")}
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-violet-300 to-purple-200 bg-clip-text text-transparent">
              {t("hero.title")}
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-4">
              {t("hero.subtitle")}
            </p>
            <p className="text-sm text-slate-400">
              {t("hero.lastUpdated")}
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 text-center">
              <p className="text-lg text-slate-300 max-w-4xl mx-auto">
                {t("intro")}
              </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto bg-slate-800/50 backdrop-blur-sm border border-slate-700/30">
                <TabsTrigger value="general" className="flex items-center gap-2 text-slate-300 data-[state=active]:text-white data-[state=active]:bg-violet-600/50 data-[state=active]:border-violet-400/30">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("tabs.general")}</span>
                  <span className="sm:hidden">Chung</span>
                </TabsTrigger>
                <TabsTrigger value="customers" className="flex items-center gap-2 text-slate-300 data-[state=active]:text-white data-[state=active]:bg-violet-600/50 data-[state=active]:border-violet-400/30">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("tabs.customers")}</span>
                  <span className="sm:hidden">Người dùng</span>
                </TabsTrigger>
                <TabsTrigger value="organizers" className="flex items-center gap-2 text-slate-300 data-[state=active]:text-white data-[state=active]:bg-violet-600/50 data-[state=active]:border-violet-400/30">
                  <Building className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("tabs.organizers")}</span>
                  <span className="sm:hidden">Nhà tổ chức</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Content for General Terms */}
              <TabsContent value="general">
                <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 shadow-xl">
                  <CardContent className="p-8">
                    <div className="h-[600px] overflow-y-auto pr-4">
                      <div className="prose prose-slate max-w-none">
                        <h2 className="text-2xl font-bold text-white mb-6">{t("general.title")}</h2>
                      
                      <div className="space-y-6">
                        <div className="bg-blue-900/30 p-6 rounded-lg border border-blue-400/30 backdrop-blur-sm">
                          <h3 className="text-xl font-semibold text-blue-300 mb-3">
                            {t("general.intellectualProperty.title")}
                          </h3>
                          <p className="text-slate-300 leading-relaxed">
                            {t("general.intellectualProperty.content")}
                          </p>
                        </div>

                        <div className="bg-amber-900/30 p-6 rounded-lg border border-amber-400/30 backdrop-blur-sm">
                          <h3 className="text-xl font-semibold text-amber-300 mb-3">
                            {t("general.governingLaw.title")}
                          </h3>
                          <p className="text-slate-300 leading-relaxed">
                            {t("general.governingLaw.content")}
                          </p>
                        </div>

                        <div className="bg-green-900/30 p-6 rounded-lg border border-green-400/30 backdrop-blur-sm">
                          <h3 className="text-xl font-semibold text-green-300 mb-3">
                            {t("general.disputeResolution.title")}
                          </h3>
                          <p className="text-slate-300 leading-relaxed">
                            {t("general.disputeResolution.content")}
                          </p>
                        </div>

                        <div className="bg-red-900/30 p-6 rounded-lg border border-red-400/30 backdrop-blur-sm">
                          <h3 className="text-xl font-semibold text-red-300 mb-3">
                            {t("general.privacy.title")}
                          </h3>
                          <p className="text-slate-300 leading-relaxed mb-4">
                            {t("general.privacy.content")}
                          </p>
                          <ul className="list-disc pl-6 text-slate-300 space-y-2">
                            {(t.raw("general.privacy.points") as string[]).map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-purple-900/30 p-6 rounded-lg border border-purple-400/30 backdrop-blur-sm">
                          <h3 className="text-xl font-semibold text-purple-300 mb-3">
                            {t("general.termModification.title")}
                          </h3>
                          <p className="text-slate-300 leading-relaxed">
                            {t("general.termModification.content")}
                          </p>
                        </div>

                        <div className="bg-indigo-900/30 p-6 rounded-lg border border-indigo-400/30 backdrop-blur-sm">
                          <h3 className="text-xl font-semibold text-indigo-300 mb-3">
                            {t("general.effectiveness.title")}
                          </h3>
                          <p className="text-slate-300 leading-relaxed">
                            {t("general.effectiveness.content")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Content for Customers */}
            <TabsContent value="customers">
              <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 shadow-xl">
                <CardContent className="p-8">
                  <div className="h-[600px] overflow-y-auto pr-4">
                    <div className="prose prose-slate max-w-none">
                      <h2 className="text-2xl font-bold text-white mb-6">{t("customers.title")}</h2>
                      
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("customers.definitions.title")}</h3>
                          <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/30 space-y-3">
                            <div><strong className="text-slate-200">{t("customers.definitions.labels.platform")}</strong> <span className="text-slate-300">{t("customers.definitions.platform")}</span></div>
                            <div><strong className="text-slate-200">{t("customers.definitions.labels.organizer")}</strong> <span className="text-slate-300">{t("customers.definitions.organizer")}</span></div>
                            <div><strong className="text-slate-200">{t("customers.definitions.labels.validTicket")}</strong> <span className="text-slate-300">{t("customers.definitions.validTicket")}</span></div>
                            <div><strong className="text-slate-200">{t("customers.definitions.labels.ticketPrice")}</strong> <span className="text-slate-300">{t("customers.definitions.ticketPrice")}</span></div>
                            <div><strong className="text-slate-200">{t("customers.definitions.labels.serviceFee")}</strong> <span className="text-slate-300">{t("customers.definitions.serviceFee")}</span></div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("customers.purchase.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-blue-300 mb-2">{t("customers.purchase.infoResponsibility.title")}</h4>
                              <p className="text-slate-300">{t("customers.purchase.infoResponsibility.content")}</p>
                            </div>
                            
                            <div className="bg-amber-900/30 p-4 rounded-lg border border-amber-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-amber-300 mb-2">{t("customers.purchase.holdTime.title")}</h4>
                              <p className="text-slate-300">{t("customers.purchase.holdTime.content")}</p>
                            </div>

                            <div className="bg-green-900/30 p-4 rounded-lg border border-green-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-green-300 mb-2">{t("customers.purchase.orderConfirmation.title")}</h4>
                              <p className="text-slate-300">{t("customers.purchase.orderConfirmation.content")}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("customers.usage.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-red-900/30 p-4 rounded-lg border border-red-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-red-300 mb-2">{t("customers.usage.firstCheckIn.title")}</h4>
                              <p className="text-slate-300">{t("customers.usage.firstCheckIn.content")}</p>
                            </div>

                            <div className="bg-orange-900/30 p-4 rounded-lg border border-orange-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-orange-300 mb-2">{t("customers.usage.security.title")}</h4>
                              <p className="text-slate-300">{t("customers.usage.security.content")}</p>
                            </div>

                            <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-purple-300 mb-2">{t("customers.usage.refusalRight.title")}</h4>
                              <p className="text-slate-300">{t("customers.usage.refusalRight.content")}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("customers.refund.title")}</h3>
                          <p className="text-slate-300 mb-4">{t("customers.refund.intro")}</p>
                          
                          <div className="space-y-6">
                            <div className="bg-blue-900/30 p-6 rounded-lg border border-blue-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-blue-300 mb-3">{t("customers.refund.customerRequest.title")}</h4>
                              <p className="text-slate-300 mb-3">{t("customers.refund.customerRequest.intro")}</p>
                              <ul className="list-disc pl-6 text-slate-300 space-y-2">
                                <li dangerouslySetInnerHTML={{ __html: parseMarkdown(t("customers.refund.customerRequest.before7Days")) }} />
                                <li dangerouslySetInnerHTML={{ __html: parseMarkdown(t("customers.refund.customerRequest.before5Days")) }} />
                              </ul>
                              <p className="text-sm text-slate-400 mt-3 italic">{t("customers.refund.customerRequest.note")}</p>
                            </div>

                            <div className="bg-green-900/30 p-6 rounded-lg border border-green-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-green-300 mb-3">{t("customers.refund.organizerIssue.title")}</h4>
                              <div className="space-y-4">
                                <div className="ml-4">
                                  <h5 className="font-medium text-green-200 mb-2">{t("customers.refund.organizerIssue.eventCancelled.title")}</h5>
                                  <span className="text-slate-300 ml-2" dangerouslySetInnerHTML={{ __html: parseMarkdown(t("customers.refund.organizerIssue.eventCancelled.fullRefund")) }} />
                                </div>
                                <div className="ml-4">
                                  <h5 className="font-medium text-green-200 mb-2">{t("customers.refund.organizerIssue.eventPostponed.title")}</h5>
                                  <ul className="list-disc pl-6 text-slate-300 space-y-1">
                                    <li>{t("customers.refund.organizerIssue.eventPostponed.keepTicket")}</li>
                                    <li dangerouslySetInnerHTML={{ __html: parseMarkdown(t("customers.refund.organizerIssue.eventPostponed.requestRefund")) }} />
                                  </ul>
                                </div>
                              </div>
                            </div>

                            <div className="bg-red-900/30 p-6 rounded-lg border border-red-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-red-300 mb-3">{t("customers.refund.antiScam.title")}</h4>
                              <p className="text-slate-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(t("customers.refund.antiScam.content")) }} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("customers.disclaimer.title")}</h3>
                          <div className="bg-slate-700/30 p-6 rounded-lg border border-slate-600/30 backdrop-blur-sm">
                            <p className="text-slate-300 mb-4">{t("customers.disclaimer.content")}</p>
                            <ul className="list-disc pl-6 text-slate-300 space-y-2">
                              {(t.raw("customers.disclaimer.points") as string[]).map((point, index) => (
                                <li key={index}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Content for Organizers */}
            <TabsContent value="organizers">
              <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 shadow-xl">
                <CardContent className="p-8">
                  <div className="h-[600px] overflow-y-auto pr-4">
                    <div className="prose prose-slate max-w-none">
                      <h2 className="text-2xl font-bold text-white mb-6">{t("organizers.title")}</h2>
                      
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("organizers.cooperation.title")}</h3>
                          <div className="bg-blue-900/30 p-6 rounded-lg border border-blue-400/30 backdrop-blur-sm">
                            <ul className="text-slate-300 space-y-2">
                              {(t.raw("organizers.cooperation.points") as string[]).map((point, index) => (
                                <li key={index}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("organizers.rightsObligations.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-red-900/30 p-4 rounded-lg border border-red-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-red-300 mb-2">{t("organizers.rightsObligations.legality.title")}</h4>
                              <p className="text-slate-300">{t("organizers.rightsObligations.legality.content")}</p>
                            </div>
                            
                            <div className="bg-amber-900/30 p-4 rounded-lg border border-amber-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-amber-300 mb-2">{t("organizers.rightsObligations.intellectualProperty.title")}</h4>
                              <p className="text-slate-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(t("organizers.rightsObligations.intellectualProperty.content")) }} />
                            </div>

                            <div className="bg-green-900/30 p-4 rounded-lg border border-green-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-green-300 mb-2">{t("organizers.rightsObligations.refundCommitment.title")}</h4>
                              <p className="text-slate-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(t("organizers.rightsObligations.refundCommitment.content")) }} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("organizers.fees.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-purple-300 mb-2">{t("organizers.fees.serviceFee.title")}</h4>
                              <p className="text-slate-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(t("organizers.fees.serviceFee.content")) }} />
                            </div>
                            
                            <div className="bg-orange-900/30 p-4 rounded-lg border border-orange-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-orange-300 mb-2">{t("organizers.fees.settlement.title")}</h4>
                              <p className="text-slate-300">{t("organizers.fees.settlement.content")}</p>
                            </div>

                            <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-slate-200 mb-2">{t("organizers.fees.invoice.title")}</h4>
                              <p className="text-slate-300" dangerouslySetInnerHTML={{ __html: parseMarkdown(t("organizers.fees.invoice.content")) }} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("organizers.cancellation.title")}</h3>
                          <div className="bg-red-900/30 p-6 rounded-lg border border-red-400/30 backdrop-blur-sm">
                            <p className="text-slate-300 mb-4">{t("organizers.cancellation.intro")}</p>
                            <ul className="list-disc pl-6 text-slate-300 space-y-3">
                              {(t.raw("organizers.cancellation.obligations") as string[]).map((obligation, index) => (
                                <li key={index} dangerouslySetInnerHTML={{ __html: parseMarkdown(obligation) }} />
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-white mb-4">{t("organizers.dataProtection.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-green-900/30 p-4 rounded-lg border border-green-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-green-300 mb-2">{t("organizers.dataProtection.dataUsage.title")}</h4>
                              <p className="text-slate-300">{t("organizers.dataProtection.dataUsage.content")}</p>
                            </div>
                            
                            <div className="bg-red-900/30 p-4 rounded-lg border border-red-400/30 backdrop-blur-sm">
                              <h4 className="font-semibold text-red-300 mb-2">{t("organizers.dataProtection.dataSharing.title")}</h4>
                              <p className="text-slate-300">{t("organizers.dataProtection.dataSharing.content")}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Contact Section */}
          <div className="mt-12 text-center">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/30 rounded-xl p-8 shadow-xl">
              <h3 className="text-xl font-semibold text-white mb-4">
                {t("contact.title")}
              </h3>
              <p className="text-slate-300 mb-6">
                {t("contact.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline" className="border-violet-400/30 text-violet-300 hover:bg-violet-600/20">
                  <a href="/contact">{t("contact.supportButton")}</a>
                </Button>
                <Button asChild className="bg-violet-600 hover:bg-violet-700 text-white">
                  <a href="mailto:support@vieticket.com">{t("contact.emailButton")}</a>
                </Button>
              </div>
            </div>
          </div>
          </div>
        </section>
      </div>
    </>
  );
}