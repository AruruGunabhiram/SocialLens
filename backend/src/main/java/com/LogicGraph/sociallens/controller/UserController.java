package com.LogicGraph.sociallens.controller;

import com.LogicGraph.sociallens.dto.user.CreateUserRequest;
import com.LogicGraph.sociallens.dto.user.UserResponse;
import com.LogicGraph.sociallens.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }

    /**
     * Returns the implicit "current user" for local-dev (no auth layer yet).
     * Creates the default local-dev user on first call if the table is empty.
     *
     * Replace this with a principal-based lookup once real auth is added.
     */
    @GetMapping("/me")
    public UserResponse me() {
        return userService.getOrCreateDefaultLocalUser();
    }
}
