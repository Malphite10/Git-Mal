"use client"

import * as React from "react"
import * as Slot from "@radix-ui/react-slot"
import { Controller, ControllerProps, FieldPath, FieldValues, UseFormReturn } from "react-hook-form"
import { cn } from "@/lib/utils"

const Form = React.forwardRef<
  HTMLFormElement,
  React.ComponentPropsWithoutRef<"form">
>(({ ...props }, ref) => (
  <form ref={ref} {...props} />
))
Form.displayName = "Form"

interface FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName
  error?: { message?: string }
  invalid?: boolean
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }
  return fieldContext
}

interface FormControlProps extends React.ComponentPropsWithoutRef<typeof Slot.Slot> {
  asChild?: boolean
}

const SlotComponent = Slot.Slot
type SlotComponentType = typeof SlotComponent

const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(({ ...props }, ref) => {
  const { error, invalid } = useFormField()
  return (
    <Slot.Slot
      ref={ref}
      className={cn(
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        invalid && "border-destructive focus:border-destructive focus:ring-destructive/20",
        props.className
      )}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

interface FormFieldProps
  extends ControllerProps<FieldValues> {
  children?: React.ReactNode
}

const FormField = <TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({
  ...props
}: FormFieldProps) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller
        {...props}
        render={({ field, fieldState, formState, ...rest }) => (
          <FormFieldContext.Provider value={{ 
            name: props.name, 
            error: fieldState.error,
            invalid: fieldState.invalid || (fieldState.error ? true : false)
          }}>
            {props.render ? props.render({ field, fieldState, formState, ...rest }) : (
              <FormControl {...rest} />
            )}
          </FormFieldContext.Provider>
        )}
      />
    </FormFieldContext.Provider>
  )
}
FormField.displayName = "FormField"

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
)
FormItem.displayName = "FormItem"

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, ...props }, ref) => {
    const { error, invalid } = useFormField()
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...props}
      />
    )
  }
)
FormLabel.displayName = "FormLabel"

interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
FormDescription.displayName = "FormDescription"

interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, children, ...props }, ref) => {
    const { error, invalid } = useFormField()
    const message = error?.message ?? children
    if (!message) return null
    return (
      <p
        ref={ref}
        className={cn("text-sm text-destructive", className)}
        {...props}
      >
        {message}
      </p>
    )
  }
)
FormMessage.displayName = "FormMessage"

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
}