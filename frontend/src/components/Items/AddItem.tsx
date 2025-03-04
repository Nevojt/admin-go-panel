import {
  Box,
  Button,
  Card,
  FormControl,
  FormErrorMessage,
  FormLabel,
  IconButton,
  Input,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Switch, useDisclosure,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"

import { CloseIcon } from "@chakra-ui/icons"
import { useRef, useState } from "react"
import {type ApiError, BlogService, type ItemCreate, ItemsService} from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"
import PropertiesModal from "../Modals/PropertiesModal"


import ReactQuill from 'react-quill'; // Import ReactQuill
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

interface FileDetail {
  name: string;
  size: string;
  file: File;
  preview?: string;
}

interface ItemCreateExtended extends ItemCreate {
  images?: File[];
}

interface AddItemProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddItem = ({ isOpen, onClose }: AddItemProps) => {
  const queryClient = useQueryClient();
  const showToast = useCustomToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileDetail[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemCreateExtended>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      title: "",
      content: "",
      status: false,
      images: [],
    },
  });

  const {
    isOpen: isPropertiesOpen,
    onOpen: onPropertiesOpen,
    onClose: onPropertiesClose,
  } = useDisclosure()

  const [properties, setProperties] = useState({})
  const handleSaveProperties = (props: any) => {
    console.log(props)
    setProperties(props)
  }

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      [{ 'font': [] }],
      [{ 'color': [] }, { 'background': [] }], // Колір тексту та фону
      [{ 'align': [] }], // Вирівнювання
      ['bold', 'italic', 'underline', 'strike'], // Стилізація тексту
      [{ 'list': 'ordered' }, { 'list': 'bullet' }], // Списки
      [{ 'indent': '-1' }, { 'indent': '+1' }], // Відступи
      ['link', 'image', 'video'], // Додавання медіа
      ['clean'], // Очищення форматування
    ],
  };

  const formats = [
    'header', 'font', 'color', 'background', 'align',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'image', 'video'
  ];

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    const selectedFiles = Array.from(event.target.files).map((file) => ({
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      file,
      preview: URL.createObjectURL(file), // Генеруємо URL для прев’ю
    }));

    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);

    setValue(
        "images",
        [...(watch("images") || []), ...selectedFiles.map((f) => f.file)],
        { shouldValidate: true }
    );
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = [...files];

    // Очищаємо URL для запобігання витоку пам’яті
    URL.revokeObjectURL(updatedFiles[index].preview!);

    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
  };

  const mutation = useMutation({
    mutationFn: async (jsonPayload: ItemCreateExtended) => {
      // Створюємо пост


      // @ts-ignore
      const postResponse = await ItemsService.createItem(jsonPayload);
      const postId = postResponse.ID;

      // Отримуємо файли
      const images = jsonPayload.images;
      if (postId && images && images.length > 0) {
        const formData = new FormData();

        images.forEach((file) => {
          formData.append("files", file); // Змінено на "images" (повинно відповідати бекенду)
        });

        console.log("Uploading images:", formData.getAll("images")); // Дебаг

        await BlogService.downloadImages(postId, formData);
      } else {
        console.warn("No images to upload.");
      }
    },
    onSuccess: () => {
      showToast("Success!", "Post created successfully.", "success");
      reset();
      setFiles([]);
      onClose();
    },
    onError: (err: ApiError) => {
      handleError(err, showToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onSubmit: SubmitHandler<ItemCreateExtended> = async (data) => {
    const payload: ItemCreateExtended = {
      title: data.title,
      content: data.content,
      price: parseFloat(String(data.price).replace(",", ".")),
      position: data.position,
      language: data.language,
      item_url: data.item_url,
      category: data.category,
      properties_id: data.properties_id, // Замінено на "properties_id" (повинно відповідати бекенду)
      status: data.status,
      images: files.map((f) => f.file), // Передаємо файли
    };

    await mutation.mutateAsync(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "xl", xl: "xl" }}
      isCentered
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Add Item</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <FormControl isRequired isInvalid={!!errors.title}>
            <FormLabel htmlFor="title">Title</FormLabel>
            <Input
              id="title"
              {...register("title", { required: "Title is required." })}
              placeholder="Title"
              type="text"
            />
            {errors.title && (
              <FormErrorMessage>{errors.title.message}</FormErrorMessage>
            )}
          </FormControl>
          <FormControl mt={4} isInvalid={!!errors.content}>
            <FormLabel htmlFor="content">Content</FormLabel>
            <ReactQuill
                theme="snow"
                value={watch('content')  || ''}
                onChange={(_, __, ___, editor) => {
                  setValue('content', editor.getHTML()); // Update form state with HTML content
                }}
                modules={modules}
                formats={formats}
            />
            {errors.content && (
                <FormErrorMessage>{errors.content.message}</FormErrorMessage>
            )}
          </FormControl >

          <FormLabel mt={4} htmlFor="properties">Properties</FormLabel>
          <Button variant="primary" onClick={onPropertiesOpen}>Add Properties</Button>
          <PropertiesModal
            isOpen={isPropertiesOpen}
            onClose={onPropertiesClose}
            onSave={handleSaveProperties}
          />

          <FormControl mt={4}>
            <FormLabel htmlFor="images">Images</FormLabel>
            <Input
                ref={fileInputRef}
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={onFileChange}
                hidden
                disabled={isSubmitting}
            />
            <Button colorScheme="teal" variant="outline" onClick={handleFileButtonClick} mt={2} isLoading={isSubmitting}>
              Upload Images
            </Button>
            <Card>
              {files.length > 0 && (
                  <List spacing={2} mt={2}>
                    {files.map((file, index) => (
                        <ListItem
                            key={index}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                        >
                          <Box display="flex" alignItems="center" gap={3}>
                            <img src={file.preview} alt={file.name} width="50" height="50" style={{ borderRadius: "5px" }} />
                            {file.name} - {file.size}
                          </Box>
                          <IconButton
                              icon={<CloseIcon />}
                              aria-label="Remove file"
                              onClick={() => handleRemoveFile(index)}
                          />
                        </ListItem>
                    ))}
                  </List>
              )}
            </Card>
          </FormControl>
          <FormControl mt={4} isInvalid={!!errors.category}>
            <FormLabel htmlFor="category">Category</FormLabel>
            <Select
              placeholder="Select Categories"
              {...register("category", {
                required: "Please select a category",
              })}
            >
              <option value="Angels">Angels</option>
              <option value="Buddy">Buddy</option>
              <option value="Pots and Drinkers">Pots and Drinkers</option>
              <option value="Animals">Animals</option>
            </Select>
            {errors.category && (
              <FormErrorMessage>{errors.category.message}</FormErrorMessage>
            )}
          </FormControl>
          <FormControl mt={4}>
            <FormLabel htmlFor="url">URL</FormLabel>
            <Input
              id="item_url"
              {...register("item_url", { required: "URL is required." })}
              placeholder="URL"
              type="text"
            />
            {errors.item_url && (
              <FormErrorMessage>{errors.item_url.message}</FormErrorMessage>
            )}
          </FormControl>
          <FormControl mt={4} isInvalid={!!errors.language}>
            <FormLabel htmlFor="language">Language</FormLabel>
            <Select
              placeholder="Select language"
              {...register("language", {
                required: "Please select a language",
              })}
            >
              <option value="PL">PL</option>
              <option value="EN">EN</option>
              <option value="DE">DE</option>
            </Select>
            {errors.language && (
              <FormErrorMessage>{errors.language.message}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl mt={4} isInvalid={!!errors.price}>
            <FormLabel htmlFor="price">Price</FormLabel>
            <Input
                id="price"
                {...register("price", {
                  required: "Price is required.",
                  validate: (value) => {
                    const parsedValue = parseFloat(String(value).replace(",", ".")); // ✅ Гарантуємо, що `value` — рядок
                    if (isNaN(parsedValue)) return "Enter a valid number.";
                    if (parsedValue <= 0) return "Price must be greater than 0.";
                    return true;
                  },
                })}
                placeholder="Enter price"
                type="text"
                inputMode="decimal"
            />
            {errors.price && (
                <FormErrorMessage>{errors.price.message}</FormErrorMessage>
            )}
          </FormControl>




          <FormControl mt={4} isInvalid={!!errors.position}>
            <FormLabel htmlFor="position">Position</FormLabel>
            <Input
              id="position"
              {...register("position", {
                required: "Position is required.",
                valueAsNumber: true,
                min: { value: 1, message: "Position must be greater than 0" },
              })}
              placeholder="Enter position"
              type="number"
            />
            {errors.position && (
              <FormErrorMessage>{errors.position.message}</FormErrorMessage>
            )}
          </FormControl>

          <FormControl mt={4} isInvalid={!!errors.status}>
            <FormLabel
              htmlFor="status"
              display="flex"
              alignItems="center"
              gap={2}
            >
              <Box
                width="12px"
                height="12px"
                borderRadius="full"
                bg={watch("status") ? "green.500" : "red.500"}
              />
              Status
            </FormLabel>
            <Switch id="status" {...register("status")} colorScheme="teal" />
          </FormControl>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Save
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default AddItem
