import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useStore } from "../../app/stores/store";
import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import TextInput from "../../app/common/form/text-input";

interface FormValues {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface Props {
	onClose: () => void;
  }
  

  const ChangePasswordForm = ({ onClose }: Props) => {
  const { userStore } = useStore();
  const [formError, setFormError] = useState<string | null>(null);

  const initialValues: FormValues = {
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  };

  const validationSchema = Yup.object({
    oldPassword: Yup.string().required("Old password is required"),
    newPassword: Yup.string().min(6, "At least 6 characters").required("New password is required"),
    confirmNewPassword: Yup.string()
      .oneOf([Yup.ref("newPassword")], "Passwords must match")
      .required("Please confirm your new password"),
  });

  return (
	<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Change Password</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            setFormError(null);
            const response = await userStore.changePassword({
              oldPassword: values.oldPassword,
              newPassword: values.newPassword,
            });

            if (response) {
              setFormError(response);
            } else {
              resetForm();
              onClose();
            }

            setSubmitting(false);
          }}
        >
          {({ handleSubmit, errors, touched, isSubmitting }) => (
            <Form onSubmit={handleSubmit} className="space-y-4">
              <TextInput
                name="oldPassword"
                label="Old Password"
                type="password"
                errors={errors}
                touched={touched}
              />
              <TextInput
                name="newPassword"
                label="New Password"
                type="password"
                errors={errors}
                touched={touched}
              />
              <TextInput
                name="confirmNewPassword"
                label="Confirm New Password"
                type="password"
                errors={errors}
                touched={touched}
              />

              {formError && (
                <p className="text-red-500 text-sm bg-red-50 p-2 rounded">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className={`w-full py-2 rounded-md transition ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2 inline" /> Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
    // <div className="max-w-md mx-auto mt-6 bg-white p-6 rounded-xl shadow-md">
    //   <h2 className="text-xl font-semibold mb-4 text-gray-700">Change Password</h2>

    //   <Formik
    //     initialValues={initialValues}
    //     validationSchema={validationSchema}
    //     onSubmit={async (values, { setSubmitting, resetForm }) => {
    //       setFormError(null);
    //       const response = await userStore.changePassword({
    //         oldPassword: values.oldPassword,
    //         newPassword: values.newPassword,
    //       });

    //       if (response) {
    //         setFormError(response);
    //       } else {
    //         resetForm();
    //       }

    //       setSubmitting(false);
    //     }}
    //   >
    //     {({ handleSubmit, errors, touched, isSubmitting }) => (
    //       <Form onSubmit={handleSubmit} className="space-y-4">
    //         <TextInput
    //           name="oldPassword"
    //           label="Old Password"
    //           type="password"
    //           errors={errors}
    //           touched={touched}
    //         />
    //         <TextInput
    //           name="newPassword"
    //           label="New Password"
    //           type="password"
    //           errors={errors}
    //           touched={touched}
    //         />
    //         <TextInput
    //           name="confirmNewPassword"
    //           label="Confirm New Password"
    //           type="password"
    //           errors={errors}
    //           touched={touched}
    //         />

    //         {formError && (
    //           <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{formError}</div>
    //         )}

    //         <button
    //           type="submit"
    //           disabled={isSubmitting}
    //           className="button-primary w-full flex items-center justify-center space-x-2"
    //         >
    //           Change Password
    //           {isSubmitting && <FaSpinner className="animate-spin ml-2" size={20} />}
    //         </button>
    //       </Form>
    //     )}
    //   </Formik>
    // </div>
  );
};

export default ChangePasswordForm;