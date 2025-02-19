import {
  Box,
  Container,
  Flex,
  Heading,
  Link,
  SkeletonText,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react"

import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react"
import DOMPurify from 'dompurify';

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { z } from "zod"

import { ItemsService } from "../../client"
import ActionsMenu from "../../components/Common/ActionsMenu.tsx"
import Navbar from "../../components/Common/Navbar"
import { PaginationFooter } from "../../components/Common/PaginationFooter.tsx"
import AddItem from "../../components/Items/AddItem"
import ImageGallery from "../../components/Modals/ModalImageGallery.tsx"

const itemsSearchSchema = z.object({
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/items")({
  component: Items,
  validateSearch: (search) => itemsSearchSchema.parse(search),
})

const PER_PAGE = 7
const POLAND = "pl"
const ENGLISH = "en"
const GERMAN = "de"

interface ItemsTableProps {
  region: string // Визначення типу для 'region'
}

interface ItemsQueryOptions {
  page: number
  region: string
}

function getItemsQueryOptions({ page, region }: ItemsQueryOptions) {
  return {
    queryFn: () =>
      ItemsService.readItems({
        region,
        skip: (page - 1) * PER_PAGE,
        limit: PER_PAGE,
      }),
    queryKey: ["items", region, { page }],
  }
}

function ItemsTable({ region }: ItemsTableProps) {
  const queryClient = useQueryClient()
  const { page } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const setPage = (page: number) =>
    navigate({
      search: (prev: { [key: string]: string }) => ({ ...prev, page }),
    })

  const {
    data: items,
    isPending,
    isPlaceholderData,
  } = useQuery({
    ...getItemsQueryOptions({ page, region }),
    placeholderData: (prevData) => prevData,
  })

  const hasNextPage = !isPlaceholderData && items?.data.length === PER_PAGE
  const hasPreviousPage = page > 1

  useEffect(() => {
    if (items?.data) {
      console.log("Loaded items data:", items.data)
    }
    if (hasNextPage) {
      queryClient.prefetchQuery(
        getItemsQueryOptions({ page: page + 1, region }),
      )
    }
  }, [page, queryClient, hasNextPage, region])

  return (
    <>
      <TableContainer>
        <Table size={{ base: "sm", md: "md" }}>
          <Thead>
            <Tr>
              {/*<Th>ID</Th>*/}
              <Th>Position</Th>
              <Th>Title</Th>
              <Th>Description</Th>
              {/*<Th>Description Second</Th>*/}
              <Th>Images</Th>
              <Th>Category</Th>
              <Th>Properties</Th>
              <Th>URL</Th>
              <Th>Language</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          {isPending ? (
            <Tbody>
              <Tr>
                {new Array(9).fill(null).map(
                  (
                    _,
                    index, // Adjust array length to match column count
                  ) => (
                    <Td key={index}>
                      <SkeletonText noOfLines={1} paddingBlock="16px" />
                    </Td>
                  ),
                )}
              </Tr>
            </Tbody>
          ) : (
            <Tbody>
              {items?.data.map((item) => (
                <Tr key={item.ID} opacity={isPlaceholderData ? 0.5 : 1}>
                  <Td>{item.position}</Td>
                  <Td isTruncated maxWidth="150px">
                    {item.title}
                  </Td>
                  <Td
                    color={!item.description ? "ui.dim" : "inherit"}
                    isTruncated
                    maxWidth="150px"
                  >
                    <SafeHtmlComponent htmlContent={item.description || 'N/A'} />
                  </Td>
                  {/*<Td color={!item.description_second ? "ui.dim" : "inherit"} isTruncated maxWidth="150px">{item.description_second || "N/A"}</Td>*/}
                  <Td>
                    <ImageGallery
                      images={
                        Array.isArray(item.images)
                          ? item.images
                          : item.images
                            ? [item.images]
                            : []
                      }
                      title={item.title}
                    />
                  </Td>
                  <Td>{item.category || "No Category"}</Td>
                  <Td>
                    {Object.entries(item.properties).map(([key, value]) => (
                      <Box key={key}>
                        <strong>{key}:</strong> {value}
                      </Box>
                    ))}
                  </Td>

                  <Td>
                    <Link
                      href={item.item_url || "#"}
                      isExternal
                      color="blue.500"
                      textDecoration="underline"
                    >
                      {item.item_url ? formatUrl(item.item_url) : "No URL"}
                    </Link>
                  </Td>
                  <Td>{item.language || "No Language"}</Td>
                  <Td>
                    <Flex gap={2}>
                      <Box
                        width="12px"
                        height="12px"
                        borderRadius="full"
                        bg={item.status ? "green.500" : "red.500"}
                      />
                      {item.status ? "Active" : "Inactive"}
                    </Flex>
                  </Td>
                  <Td>
                    <ActionsMenu type={"Item"} value={item} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          )}
        </Table>
      </TableContainer>
      <PaginationFooter
        page={page}
        onChangePage={setPage}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
      />
    </>
  )
}

function Items() {
  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
        Items Management
      </Heading>

      <Navbar type={"Item"} addModalAs={AddItem} />
      <Tabs isFitted variant="enclosed">
        <TabList mb="1em">
          <Tab _selected={{ color: "white", bg: "#D65A17" }}>Polish</Tab>
          <Tab _selected={{ color: "white", bg: "#D65A17" }}>English</Tab>
          <Tab _selected={{ color: "white", bg: "#D65A17" }}>German</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <ItemsTable region={POLAND} />
          </TabPanel>
          <TabPanel>
            <ItemsTable region={ENGLISH} />
          </TabPanel>
          <TabPanel>
            <ItemsTable region={GERMAN} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
}

function formatUrl(url: string) {
  try {
    const { hostname } = new URL(url)
    return hostname // This will display only the domain part of the URL
  } catch (error) {
    return url || "No URL" // Fallback if the URL is invalid or empty
  }
}

// @ts-ignore
function SafeHtmlComponent({ htmlContent }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />;
}