import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Select,
  SelectContent,
  SelectListbox,
  SelectOption,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  useColorModeValue,
  Tabs,
  TabList,
  Tab,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td
} from "@hope-ui/solid"
import { createSignal, createEffect, createMemo, For } from "solid-js"
import { useFetch, useT, useManageTitle } from "~/hooks"
import { handleResp, notify } from "~/utils"
import {
  getTenantCertificate,
  getTenantCertificateRequests,
  createTenantCertificateRequest,
  downloadTenantCertificate
} from "~/utils/certificate"
import type { Certificate, CertificateRequest, Resp } from "~/types"

const Certificates = () => {
  const t = useT()
  useManageTitle("certificate.title")
  const [cert, setCert] = createSignal<Certificate | null>(null)
  const [requests, setRequests] = createSignal<CertificateRequest[]>([])
  const [loading, data] = useFetch(getTenantCertificate)
  const [, requestsData] = useFetch(getTenantCertificateRequests)
  const [type, setType] = createSignal<"user" | "node">("user")
  const [reason, setReason] = createSignal("")
  const [errors, setErrors] = createSignal<{type?: string, reason?: string}>({})
  const [isOpen, setIsOpen] = createSignal(false)
  const [, createRequest] = useFetch(createTenantCertificateRequest)

  createEffect(() => {
    data().then((response: Resp<Certificate | null>) => {
      handleResp<Certificate | null>(response, (data) => setCert(data))
    })
    requestsData().then((response: Resp<CertificateRequest[]>) => {
      handleResp<CertificateRequest[]>(response, (data) => setRequests(data || []))
    })
  })

  const hasPending = createMemo(() =>
      requests().some(r => r.status === "pending")
  )

  const validate = () => {
    const newErrors: {type?: string, reason?: string} = {}
    if (!type()) newErrors.type = t("certificate.type_required")
    if (!reason()) newErrors.reason = t("certificate.reason_required")
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const submitRequest = async () => {
    if (!validate()) return

    const result = await createRequest({ type: type(), reason: reason() })
    handleResp(result, () => {
      notify.success(t("certificate.request_created"))
      setIsOpen(false)
      setType("user")
      setReason("")
      setErrors({})
      // Refresh requests
      requestsData().then((response: Resp<CertificateRequest[]>) => {
        handleResp<CertificateRequest[]>(response, (data) => setRequests(data || []))
      })
    })
  }

  const downloadCert = async () => {
    try {
      const blob = await downloadTenantCertificate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${cert()?.name || "certificate"}.crt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      notify.success(t("certificate.download_started"))
    } catch (e: any) {
      notify.error(`${t("certificate.download_started")} - ${e.message}`)
    }
  }

  return (
      <VStack w="$full" alignItems="start" spacing="$4">
        <HStack justifyContent="space-between" w="$full">
          <Text fontSize="$2xl" fontWeight="$bold">
            {t("certificate.title")}
          </Text>
          <Button colorScheme="primary" onClick={() => setIsOpen(true)}>
            {t("certificate.request_certificate")}
          </Button>
        </HStack>

        {loading() ? (
            <HStack spacing="$2">
              <Spinner size="sm" />
              <Text>{t("global.loading")}</Text>
            </HStack>
        ) : (
            <>
              {!cert() ? (
                  <Alert status="info">
                    <AlertIcon />
                    <Box flex="1">
                      <AlertTitle>{t("certificate.no_certificates")}</AlertTitle>
                      <AlertDescription display="block">
                        {t("certificate.no_certificates_desc")}
                      </AlertDescription>
                    </Box>
                  </Alert>
              ) : (
                  <VStack w="$full" spacing="$4" p="$4" border="1px solid $neutral7" rounded="$md">
                    <HStack w="$full" justifyContent="space-between">
                      <Text fontWeight="$semibold">{cert()!.name}</Text>
                      <Badge colorScheme={cert()!.status === "valid" ? "success" : cert()!.status === "expiring" ? "warning" : "neutral"}>
                        {t(`certificate.${cert()!.status}`)}
                      </Badge>
                    </HStack>
                    <HStack w="$full" justifyContent="space-between">
                      <Text>{t("certificate.type")}: {t(`certificate.${cert()!.type}`)}</Text>
                      <Text>{t("certificate.owner")}: {cert()!.owner}</Text>
                    </HStack>
                    <HStack w="$full" justifyContent="space-between">
                      <Text>{t("certificate.issued_date")}: {cert()!.issued_date ? new Date(cert()!.issued_date).toLocaleDateString() : 'N/A'}</Text>
                      <Text>{t("certificate.expiration_date")}: {cert()!.expiration_date ? new Date(cert()!.expiration_date).toLocaleDateString() : 'N/A'}</Text>
                    </HStack>
                    <Button onClick={downloadCert}>
                      {t("certificate.download")}
                    </Button>
                  </VStack>
              )}

              {hasPending() ? (
                  <VStack w="$full" spacing="$4">
                    <Text fontSize="$lg" fontWeight="$semibold">
                      {t("certificate.certificate_requests")}
                    </Text>
                    <Box w="$full" overflowX="auto">
                      <Table dense>
                        <Thead>
                          <Tr>
                            <Th>{t("certificate.type")}</Th>
                            <Th>{t("certificate.reason")}</Th>
                            <Th>{t("certificate.status")}</Th>
                            <Th>{t("certificate.created_at")}</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          <For each={requests()}>
                            {(r) => (
                                <Tr>
                                  <Td>{t(`certificate.${r.type}`)}</Td>
                                  <Td>{r.reason}</Td>
                                  <Td>
                                    <Badge colorScheme={r.status === "pending" ? "warning" : r.status === "valid" ? "success" : "danger"}>
                                      {t(`certificate.${r.status}`)}
                                    </Badge>
                                  </Td>
                                  <Td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</Td>
                                </Tr>
                            )}
                          </For>
                        </Tbody>
                      </Table>
                    </Box>
                  </VStack>
              ) : (
                  <Alert status="info">
                    <AlertIcon />
                    <Box flex="1">
                      <AlertTitle>{t("certificate.no_requests")}</AlertTitle>
                      <AlertDescription display="block">
                        {t("certificate.no_requests_desc")}
                      </AlertDescription>
                    </Box>
                  </Alert>
              )}
            </>
        )}

        <Modal opened={isOpen()} onClose={() => setIsOpen(false)}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{t("certificate.request_certificate")}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing="$4">
                <FormControl invalid={!!errors().type}>
                  <FormLabel>{t("certificate.type")}</FormLabel>
                  <Select value={type()} onChange={(value) => setType(value as "user" | "node")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectListbox>
                        <SelectOption value="user">
                          <SelectOptionText>{t("certificate.user")}</SelectOptionText>
                        </SelectOption>
                        <SelectOption value="node">
                          <SelectOptionText>{t("certificate.node")}</SelectOptionText>
                        </SelectOption>
                      </SelectListbox>
                    </SelectContent>
                  </Select>
                  <FormErrorMessage>{errors().type}</FormErrorMessage>
                </FormControl>

                <FormControl invalid={!!errors().reason}>
                  <FormLabel>{t("certificate.reason")}</FormLabel>
                  <Input
                      value={reason()}
                      onInput={(e) => setReason(e.currentTarget.value)}
                      placeholder={t("certificate.reason_placeholder")}
                  />
                  <FormErrorMessage>{errors().reason}</FormErrorMessage>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <HStack spacing="$2">
                <Button onClick={() => setIsOpen(false)}>
                  {t("global.cancel")}
                </Button>
                <Button colorScheme="primary" onClick={submitRequest}>
                  {t("global.submit")}
                </Button>
              </HStack>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
  )
}

export default Certificates