import React from 'react';
import { AdminStudentForm } from './libraryadmin';

/**
 * AddStudentPage
 * - Uses existing Add/Edit student UI unchanged.
 * - Backend connection uses authenticated Axios client via store actions.
 */
export default function AddStudentPage() {
  return <AdminStudentForm />;
}

