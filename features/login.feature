Feature: Autenticación de usuarios en el sistema (Alumnos y Maestros)

  Background:
    Given que el servidor está en ejecución
    And los usuarios de prueba están registrados en sus respectivos roles

  Scenario Outline: Intento de inicio de sesión de <rol> (<tipoUsuario>)
    When el usuario con número de control "<nocontrol>" intenta iniciar sesión como "<rol>" con la clave "<clave>"
    Then la respuesta debe ser exitosa: <exito>
    And debe ver el mensaje "<mensaje>"

    Examples:
      | tipoUsuario       | nocontrol | rol       | clave  | exito | mensaje                                    |
      # --- Alumno como Asesorado ---
      | Alumno Existente  | 12345678  | asesorado | 123456 | true  | Login exitoso                              |
      | Alumno Existente  | 12345678  | asesorado | 123465 | false | Número de control o contraseña incorrectos |
      | Alumno No Exist   | 12345687  | asesorado | 123456 | false | Número de control o contraseña incorrectos |
      
      # --- Alumno como Tutor ---
      | Alumno Existente  | 12345678  | tutor     | 123456 | true  | Login exitoso                              |
      | Alumno Existente  | 12345678  | tutor     | 123465 | false | Número de control o contraseña incorrectos |
      | Alumno No Exist   | 12345687  | tutor     | 123456 | false | Número de control o contraseña incorrectos |
      
      # --- Maestro como Tutor ---
      | Maestro Existente | 99999999  | tutor     | 123456 | true  | Login exitoso                              |
      | Maestro Existente | 99999999  | tutor     | 123465 | false | Número de control o contraseña incorrectos |
      | Maestro No Exist  | 99999990  | tutor     | 123456 | false | Número de control o contraseña incorrectos |