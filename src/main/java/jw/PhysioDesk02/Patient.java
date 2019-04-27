package jw.PhysioDesk02;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.Version;

@Data
@Entity
public class Patient {

    private @Id @GeneratedValue Long id;
    private String firstName;
    private String lastName;
    private String description;

    private @Version @JsonIgnore Long version;

    private Patient() {
    }

    public Patient(String firstName, String lastName, String description) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.description = description;

    }
}
