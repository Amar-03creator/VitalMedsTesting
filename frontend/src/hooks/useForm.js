import { useState, useCallback } from 'react';

/**
 * useForm – lightweight form state + validation hook.
 *
 * @param {object}   initialValues
 * @param {Function} [validate]   - (values) => errors object
 *
 * @returns {{ values, errors, touched, handleChange, handleBlur, handleSubmit, reset, setValues, setFieldValue }}
 */
export function useForm(initialValues = {}, validate = null) {
  const [values,  setValues]  = useState(initialValues);
  const [errors,  setErrors]  = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked, files } = e.target;
    const newValue = type === 'checkbox' ? checked : type === 'file' ? files : value;
    setValues(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    if (validate) {
      const result = validate(values);
      if (result[name]) setErrors(prev => ({ ...prev, [name]: result[name] }));
    }
  }, [validate, values]);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  }, [errors]);

  const handleSubmit = useCallback((onSubmit) => async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (validate) {
      const result = validate(values);
      if (Object.keys(result).some(k => result[k])) {
        setErrors(result);
        const allTouched = Object.keys(values).reduce((acc, k) => ({ ...acc, [k]: true }), {});
        setTouched(allTouched);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }, [validate, values]);

  const reset = useCallback((newValues) => {
    setValues(newValues || initialValues);
    setErrors({});
    setTouched({});
    setSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    submitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValues,
    setFieldValue,
  };
}

export default useForm;
