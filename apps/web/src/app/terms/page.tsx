"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, Users, Building } from "lucide-react";
import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("terms");
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/20 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#2A273F] via-[#3A3555] to-[#2A273F] text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400/20 backdrop-blur-sm px-4 py-2 rounded-full text-yellow-300 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-4">
            {t("hero.subtitle")}
          </p>
          <p className="text-sm text-gray-400">
            {t("hero.lastUpdated")}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 text-center">
            <p className="text-lg text-gray-700 max-w-4xl mx-auto">
              {t("intro")}
            </p>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">{t("tabs.general")}</span>
                <span className="sm:hidden">Chung</span>
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">{t("tabs.customers")}</span>
                <span className="sm:hidden">Người dùng</span>
              </TabsTrigger>
              <TabsTrigger value="organizers" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline">{t("tabs.organizers")}</span>
                <span className="sm:hidden">Nhà tổ chức</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content for General Terms */}
            <TabsContent value="general">
              <Card>
                <CardContent className="p-8">
                  <div className="h-[600px] overflow-y-auto pr-4">
                    <div className="prose prose-gray max-w-none">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("general.title")}</h2>
                      
                      <div className="space-y-6">
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                          <h3 className="text-xl font-semibold text-blue-900 mb-3">
                            {t("general.intellectualProperty.title")}
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            {t("general.intellectualProperty.content")}
                          </p>
                        </div>

                        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                          <h3 className="text-xl font-semibold text-yellow-900 mb-3">
                            {t("general.governingLaw.title")}
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            {t("general.governingLaw.content")}
                          </p>
                        </div>

                        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                          <h3 className="text-xl font-semibold text-green-900 mb-3">
                            {t("general.disputeResolution.title")}
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            {t("general.disputeResolution.content")}
                          </p>
                        </div>

                        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                          <h3 className="text-xl font-semibold text-red-900 mb-3">
                            {t("general.privacy.title")}
                          </h3>
                          <p className="text-gray-700 leading-relaxed mb-4">
                            {t("general.privacy.content")}
                          </p>
                          <ul className="list-disc pl-6 text-gray-700 space-y-2">
                            {(t.raw("general.privacy.points") as string[]).map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                          <h3 className="text-xl font-semibold text-purple-900 mb-3">
                            {t("general.termModification.title")}
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            {t("general.termModification.content")}
                          </p>
                        </div>

                        <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-200">
                          <h3 className="text-xl font-semibold text-indigo-900 mb-3">
                            {t("general.effectiveness.title")}
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
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
              <Card>
                <CardContent className="p-8">
                  <div className="h-[600px] overflow-y-auto pr-4">
                    <div className="prose prose-gray max-w-none">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("customers.title")}</h2>
                      
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("customers.definitions.title")}</h3>
                          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <div><strong>{t("customers.definitions.labels.platform")}</strong> {t("customers.definitions.platform")}</div>
                            <div><strong>{t("customers.definitions.labels.organizer")}</strong> {t("customers.definitions.organizer")}</div>
                            <div><strong>{t("customers.definitions.labels.validTicket")}</strong> {t("customers.definitions.validTicket")}</div>
                            <div><strong>{t("customers.definitions.labels.ticketPrice")}</strong> {t("customers.definitions.ticketPrice")}</div>
                            <div><strong>{t("customers.definitions.labels.serviceFee")}</strong> {t("customers.definitions.serviceFee")}</div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("customers.purchase.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <h4 className="font-semibold text-blue-900 mb-2">{t("customers.purchase.infoResponsibility.title")}</h4>
                              <p className="text-gray-700">{t("customers.purchase.infoResponsibility.content")}</p>
                            </div>
                            
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <h4 className="font-semibold text-yellow-900 mb-2">{t("customers.purchase.holdTime.title")}</h4>
                              <p className="text-gray-700">{t("customers.purchase.holdTime.content")}</p>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-2">{t("customers.purchase.orderConfirmation.title")}</h4>
                              <p className="text-gray-700">{t("customers.purchase.orderConfirmation.content")}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("customers.usage.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <h4 className="font-semibold text-red-900 mb-2">{t("customers.usage.firstCheckIn.title")}</h4>
                              <p className="text-gray-700">{t("customers.usage.firstCheckIn.content")}</p>
                            </div>

                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                              <h4 className="font-semibold text-orange-900 mb-2">{t("customers.usage.security.title")}</h4>
                              <p className="text-gray-700">{t("customers.usage.security.content")}</p>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-900 mb-2">{t("customers.usage.refusalRight.title")}</h4>
                              <p className="text-gray-700">{t("customers.usage.refusalRight.content")}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("customers.refund.title")}</h3>
                          <p className="text-gray-600 mb-4">{t("customers.refund.intro")}</p>
                          
                          <div className="space-y-6">
                            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                              <h4 className="font-semibold text-blue-900 mb-3">{t("customers.refund.customerRequest.title")}</h4>
                              <p className="text-gray-700 mb-3">{t("customers.refund.customerRequest.intro")}</p>
                              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li dangerouslySetInnerHTML={{ __html: t("customers.refund.customerRequest.before7Days") }} />
                                <li dangerouslySetInnerHTML={{ __html: t("customers.refund.customerRequest.before5Days") }} />
                              </ul>
                              <p className="text-sm text-gray-600 mt-3 italic">{t("customers.refund.customerRequest.note")}</p>
                            </div>

                            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-3">{t("customers.refund.organizerIssue.title")}</h4>
                              <div className="space-y-4">
                                <div className="ml-4">
                                  <h5 className="font-medium text-green-800 mb-2">{t("customers.refund.organizerIssue.eventCancelled.title")}</h5>
                                  <span className="text-gray-700 ml-2" dangerouslySetInnerHTML={{ __html: t("customers.refund.organizerIssue.eventCancelled.fullRefund") }} />
                                </div>
                                <div className="ml-4">
                                  <h5 className="font-medium text-green-800 mb-2">{t("customers.refund.organizerIssue.eventPostponed.title")}</h5>
                                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                                    <li>{t("customers.refund.organizerIssue.eventPostponed.keepTicket")}</li>
                                    <li dangerouslySetInnerHTML={{ __html: t("customers.refund.organizerIssue.eventPostponed.requestRefund") }} />
                                  </ul>
                                </div>
                              </div>
                            </div>

                            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                              <h4 className="font-semibold text-red-900 mb-3">{t("customers.refund.antiScam.title")}</h4>
                              <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: t("customers.refund.antiScam.content") }} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("customers.disclaimer.title")}</h3>
                          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <p className="text-gray-700 mb-4">{t("customers.disclaimer.content")}</p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
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
              <Card>
                <CardContent className="p-8">
                  <div className="h-[600px] overflow-y-auto pr-4">
                    <div className="prose prose-gray max-w-none">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("organizers.title")}</h2>
                      
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("organizers.cooperation.title")}</h3>
                          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                            <ul className="text-gray-700 space-y-2">
                              {(t.raw("organizers.cooperation.points") as string[]).map((point, index) => (
                                <li key={index}>• {point}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("organizers.rightsObligations.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <h4 className="font-semibold text-red-900 mb-2">{t("organizers.rightsObligations.legality.title")}</h4>
                              <p className="text-gray-700">{t("organizers.rightsObligations.legality.content")}</p>
                            </div>
                            
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <h4 className="font-semibold text-yellow-900 mb-2">{t("organizers.rightsObligations.intellectualProperty.title")}</h4>
                              <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: t("organizers.rightsObligations.intellectualProperty.content") }} />
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-2">{t("organizers.rightsObligations.refundCommitment.title")}</h4>
                              <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: t("organizers.rightsObligations.refundCommitment.content") }} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("organizers.fees.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                              <h4 className="font-semibold text-purple-900 mb-2">{t("organizers.fees.serviceFee.title")}</h4>
                              <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: t("organizers.fees.serviceFee.content") }} />
                            </div>
                            
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                              <h4 className="font-semibold text-orange-900 mb-2">{t("organizers.fees.settlement.title")}</h4>
                              <p className="text-gray-700">{t("organizers.fees.settlement.content")}</p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-gray-900 mb-2">{t("organizers.fees.invoice.title")}</h4>
                              <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: t("organizers.fees.invoice.content") }} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("organizers.cancellation.title")}</h3>
                          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                            <p className="text-gray-700 mb-4">{t("organizers.cancellation.intro")}</p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-3">
                              {(t.raw("organizers.cancellation.obligations") as string[]).map((obligation, index) => (
                                <li key={index} dangerouslySetInnerHTML={{ __html: obligation }} />
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{t("organizers.dataProtection.title")}</h3>
                          <div className="space-y-4">
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <h4 className="font-semibold text-green-900 mb-2">{t("organizers.dataProtection.dataUsage.title")}</h4>
                              <p className="text-gray-700">{t("organizers.dataProtection.dataUsage.content")}</p>
                            </div>
                            
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                              <h4 className="font-semibold text-red-900 mb-2">{t("organizers.dataProtection.dataSharing.title")}</h4>
                              <p className="text-gray-700">{t("organizers.dataProtection.dataSharing.content")}</p>
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
            <div className="bg-gradient-to-r from-gray-50 to-yellow-50 rounded-xl p-8 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {t("contact.title")}
              </h3>
              <p className="text-gray-600 mb-6">
                {t("contact.description")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline">
                  <a href="/contact">{t("contact.supportButton")}</a>
                </Button>
                <Button asChild>
                  <a href="mailto:support@vieticket.com">{t("contact.emailButton")}</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}